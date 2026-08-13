# Review: Fahrgemeinschaftsplaner

Zwei Fragen: (1) Algorithmus allgemeingültiger, (2) App distributable.
Vorweg drei Sicherheitsfunde, die Frage 2 blockieren — die stehen unten in Teil 3.

---

## Teil 1 — Algorithmus verallgemeinern

### Was heute limitiert

Der Kern ist ein **Bucket-Zähler über exakte Besetzungsmengen**:
`get_unique_attendance_ids()` liefert alle vorgekommenen Anwesenheits-Sets, `calcQuoteSp`
zählt pro Set, wie oft wer gefahren ist, `nextDriver` nimmt das Minimum.

Daraus folgen vier harte Grenzen:

1. **Genau zwei Etappen sind fest verdrahtet.** `fahrerA_id`/`fahrerB_id` als Spalten,
   `startpunkt ∈ {1,2}`, `eq("startpunkt", 2)` in `get_drivers`, `WHERE id NOT IN (… startpunkt = 2)`
   in den SPs. Ein dritter Zustieg ist nicht additiv einbaubar — er kostet Schema, SPs, API-Routen und UI.
2. **Kombinatorische Explosion.** Die Zahl der Buckets wächst mit 2^n. Bei 4 Fahrern ab A sind
   das schon 16 Töpfe, die meisten leer oder mit 1–2 Fahrten besetzt. Jede neue Besetzung startet
   bei Null — es gibt keinen Wissenstransfer zwischen Buckets. Genau deshalb existiert der
   Partial-Match-Fallback in `berechneFahrerVorschlagSp`, inklusive
   `// todo: handle multiple partialMatchingQuotes (possible for drivers > 3)` und einem
   willkürlichen `.pop()`, wenn mehrere Teilmengen passen. Der Fallback ist nicht erweiterbar,
   er ist ein Symptom.
3. **Die Berechnung liegt trotz SPs im Client-Prozess.** Die SPs liefern nur die DISTINCT-Sets;
   `calcQuoteSp` zieht danach für *jedes* Set die komplette `fahrten`-Tabelle nach Node,
   `quotes_zw` sogar |SP-Fahrer| × |Sets| mal. Das erklärte Ziel (wenig Transfer) wird verfehlt.
4. **Keine Kapazität im Modell.** Die 5 bzw. 9 Sitze kommen nirgends vor. Bei 6 Anwesenden
   müsste die App zwei Fahrer je Etappe vorschlagen; das Datenmodell kann das nicht ausdrücken.

### Zielmodell: Etappen + Saldo

Ersetze „Zähler je Besetzung" durch ein **Soll/Ist-Saldo pro Etappe**. Das bildet das eigentliche
Ziel („möglichst gerecht, nur Fahrten zählen, bei denen man dabei war") direkt ab, statt es zu
approximieren.

Für jede Fahrt *t*, jede Etappe *l* (Etappe *l* = Stopp *l* → Stopp *l+1*):

- `P(t,l)` = Mitfahrende auf dieser Etappe
- `E(t,l) ⊆ P(t,l)` = davon fahrberechtigt und anwesend
- `D(t,l) ⊆ E(t,l)` = tatsächliche Fahrer (i. d. R. 1, bei Kapazitätsüberschreitung mehrere)
- `w(l)` = Gewicht der Etappe (Default 1; alternativ Kilometer)

Buchung:

```
∀ m ∈ E(t,l):   soll(m,l) += w(l) / |E(t,l)|
∀ m ∈ D(t,l):   ist (m,l) += w(l) / |D(t,l)|

saldo(m,l) = ist(m,l) − soll(m,l)
```

Vorschlag für Etappe *l* = `argmin saldo` über `E(t_neu, l)`.
Tiebreak deterministisch: längster Abstand zur letzten Fahrt → kleinste ID.

**Warum das die Anforderungen erfüllt:**

| Anforderung | Abbildung |
|---|---|
| beliebig viele Stopps | Etappenindex `l` statt Spalten A/B |
| nur Fahrten zählen, bei denen man dabei war | wer nicht in `E(t,l)` ist, bekommt kein Soll — Saldo unverändert |
| am Zwischenstopp: A-Fahrer gegen B-Fahrer | `E(t,2)` = anwesende A-Fahrer (die weiterfahren) ∪ anwesende B-Fahrer. Ergibt sich automatisch aus `home_stop ≤ l` |
| je Besetzung ermitteln | implizit: bei 3 Fahrberechtigten schuldet man 1/3, bei 2 schuldet man 1/2 |
| Kapazität | `D` ist eine Menge; ist `|P(t,l)| > Sitze`, werden zwei Fahrer vorgeschlagen und teilen sich das Ist |

Das heutige Modell ist ein **Spezialfall**: bei konstanter Besetzung schuldet jeder 1/n pro Fahrt,
der Fahrer bekommt +1 → exakter Round-Robin, identisch zum Ist-Verhalten. Es ändert sich nur das
Verhalten bei *wechselnden* Besetzungen — und genau da ist das Ist-Modell heute blind.

Zustand: **eine Zahl pro Mitglied und Etappe** statt 2^n Buckets. Numerik als `NUMERIC`,
Vergleich mit Toleranz (1e-9).

### Datenmodell

```sql
groups        (id, name, default_seats, timezone)
stops         (id, group_id, seq, name)                 -- 1 = Startpunkt, 2 = Zwischenstopp, …
members       (id, group_id, name, label, home_stop_seq,
               can_drive, vehicle_seats, active)
trips         (id, group_id, date, direction)
trip_parts    (trip_id, member_id, from_seq, to_seq)    -- ersetzt anwesend_ids
trip_drivers  (trip_id, leg_seq, member_id)             -- ersetzt fahrerA_id / fahrerB_id
driver_ledger (group_id, member_id, leg_seq, trip_id, delta NUMERIC)
```

`trip_drivers` mit Etappenindex ist der wichtigste einzelne Umbau — damit fällt die A/B-Verdrahtung
in Schema, SPs, API und UI gleichzeitig weg.

`driver_ledger` wird per Trigger auf `trip_drivers` fortgeschrieben (O(1) je neuer Fahrt) und ist
bei Löschung einer Fahrt automatisch konsistent. Kein Neuberechnen der Historie.

### Ein RPC statt sechs Roundtrips

```sql
create or replace function suggest_drivers(p_group uuid, p_present bigint[])
returns table (leg_seq int, member_id bigint, balance numeric, last_drive date, rnk int)
language sql stable as $$
with legs as (
  select generate_series(1, (select max(seq) - 1 from stops where group_id = p_group)) as leg_seq
),
eligible as (
  select l.leg_seq, m.id as member_id
  from legs l
  join members m on m.group_id = p_group
                and m.id = any(p_present)
                and m.active and m.can_drive
                and m.home_stop_seq <= l.leg_seq
),
bal as (
  select member_id, leg_seq, sum(delta) as balance
  from driver_ledger where group_id = p_group group by 1, 2
),
last as (
  select td.member_id, max(t.date) as last_drive
  from trip_drivers td join trips t on t.id = td.trip_id
  where t.group_id = p_group group by 1
)
select e.leg_seq, e.member_id,
       coalesce(b.balance, 0), l.last_drive,
       row_number() over (partition by e.leg_seq
                          order by coalesce(b.balance, 0) asc,
                                   l.last_drive asc nulls first,
                                   e.member_id asc)::int
from eligible e
left join bal  b on b.member_id = e.member_id and b.leg_seq = e.leg_seq
left join last l on l.member_id = e.member_id;
$$;
```

Der Client schickt die Anwesenheitsliste und bekommt ~10 Zeilen zurück — statt aller Buckets aller
Besetzungen. Damit ist das ursprüngliche Ziel (wenig Transfer) tatsächlich erreicht, und
`calc_qoutes.ts`, `quotes_sp.ts`, `quotes_zw.ts`, `get_unique_attendance_ids`,
`get_unique_zw_attendance_ids` sowie die dreifach verschachtelten Maps in `index.tsx`
(`Map<number, Map<string, Map<number, number>>>`) entfallen ersatzlos.

### Pluggable Strategie

`groups.strategy` als Feld (`'balance' | 'round_robin' | 'weighted_km'`) und die Rangfolge in einer
Funktion je Strategie. Dann ist die Fairness-Definition Konfiguration, nicht Code.

### Migration in Schritten

1. `trip_drivers` + `driver_ledger` additiv anlegen, aus `fahrten` befüllen (Backfill-Skript),
   `fahrerA_id`/`fahrerB_id` per Trigger doppelt schreiben.
2. `suggest_drivers` einführen, im UI hinter Feature-Flag gegen das Alt-Verfahren vergleichen
   (gleiche Historie → beide sollten bei konstanter Besetzung identisch vorschlagen).
3. Alt-Pfad und die fünf Quotes-Dateien löschen.
4. Stops/Members generalisieren, Kapazität aktivieren.

### Nebenbefunde im Algorithmus

- `quotes.get(a) | 0` in `nextDriver`: Bitwise-OR schneidet auf Int32 ab und macht aus `NaN` eine 0.
  Bei Saldo-Werten (NUMERIC) wäre das fatal. `?? 0` verwenden.
- `lastTourA - lastTourB` mit `|| 0`: mischt `Date` und `0`, funktioniert nur zufällig.
- `anwesend.sort(...)` mutiert das übergebene Array in-place.
- `currentDate.toISOString().split("T")[0]` in `new_day.tsx`: konvertiert nach UTC. In der
  deutschen Sommerzeit kippt das Datum bei Mitternacht-nahen Werten um einen Tag. Lokales
  Formatieren (`sv-SE`-Locale oder manuell) verwenden.
- Wochenendlogik `getDay() === 0 || 6` ist hardcodiert — gehört als Regel an die Gruppe
  (Fahrtage, Feiertage).

---

## Teil 2 — Distributable

### Was heute im Weg steht

**Das Schema fehlt im Repo.** `supabase/` enthält vier SPs und die `invites`-Tabelle. Die beiden
zentralen Tabellen `fahrer` und `fahrten` sind nirgends definiert. Niemand kann die App aufsetzen.
Das ist der wörtliche Blocker.

→ Supabase CLI übernehmen: `supabase init`, alles nach `supabase/migrations/<timestamp>_*.sql`,
`supabase/seed.sql` für Demodaten, `supabase db push` im Deploy. Damit ist auch lokales Entwickeln
gegen `supabase start` möglich.

**Single-Tenant.** Kein `group_id`. Eine Supabase-Instanz = eine Fahrgemeinschaft.
Sobald `group_id` + `memberships` + RLS („sehe nur Zeilen meiner Gruppen") existieren, sind beide
Distributionsmodelle offen — Self-Host *und* gehostete Mehrmandanten-Variante — ohne zweiten Umbau.

**Nicht reproduzierbare Builds.** `"next": "latest"`, `"react": "latest"`, `"react-dom": "latest"`.
Ein Nutzer, der in sechs Monaten installiert, bekommt eine andere App. Auf `^15.x` / `^19.x` pinnen,
CI mit `npm ci` + `tsc --noEmit`.

**Browser-Kompatibilität.** `new_day.tsx` nutzt `Set.prototype.difference` und `.intersection`,
`berechneFahrerVorschlagSp` nutzt Iterator-Helpers (`allQuotesSp.keys().filter(...)`). Beides ist
erst ab Chrome 122 / Safari 17.4 / Firefox 127 verfügbar. Auf etwas älteren Android-Geräten wirft
die App eine TypeError — bei einer Handy-App der wahrscheinlichste Supportfall. Ersetzen oder
polyfillen (core-js).

**Deutsch im Schema.** `fahrer`, `fahrten`, `anwesend_ids`, `startpunkt`, `fahrerA_id`. Für Verteilung
über den deutschsprachigen Raum hinaus: Bezeichner auf Englisch (kommt beim Umbau aus Teil 1
ohnehin), UI-Texte über `next-intl` mit `de` als Default.

**`scripts/postbuild.js`** heißt „postbuild", läuft aber vor `next build` und schreibt `.env.local`.
Bei Shallow-Clones in CI liefert `git describe` nichts, auf read-only-Dateisystemen schlägt der
Write fehl. Besser: Version über `env` der Plattform durchreichen
(`VERCEL_GIT_COMMIT_SHA` o. ä.) und in `next.config.js` unter `env` setzen, ohne Datei zu schreiben.

**`.env.example.local` ist unvollständig** — der Service-Role-Key fehlt, obwohl die App ohne ihn
nicht startet (Setup, Invites, Fahrerverwaltung).

### Distributionswege

| Weg | Aufwand | Passt wenn |
|---|---|---|
| **A — Template-Repo** „Deploy to Vercel" + eigenes Supabase-Projekt je Gruppe | klein: Migrations + README + `.env.example` vervollständigen | technisch versierte Nutzer, wenig Wartung für dich |
| **B — Docker-Compose Self-Host** (`output: 'standalone'` + supabase/docker) | mittel: Dockerfile, Compose, Healthchecks | Vereine/Firmen mit eigener Infrastruktur |
| **C — Mehrmandantenfähig gehostet** | groß: `group_id` überall, RLS, Onboarding, Abrechnung | wenn es ein Produkt werden soll |

Empfehlung: **A jetzt, dabei aber das Schema schon mit `group_id` bauen.** Der Schritt nach C ist
dann eine Zugriffs-, keine Datenmodellfrage.

Zusätzlich naheliegend, weil die Nutzung am Handy stattfindet: PWA-Manifest + Service Worker
(`next-pwa`), damit die App auf dem Homescreen landet.

### Tests

Der Algorithmus ist reine Logik und damit ideal testbar — das ist die Voraussetzung dafür, dass
Fremde daran mitentwickeln können. Zwei Ebenen:

- **Property-Test** (fast-check): über zufällige Historien gilt die Invariante
  `max(saldo) − min(saldo) ≤ 1` innerhalb einer Etappe für alle durchgängig Anwesenden.
- **Golden-Test**: eure reale Historie als Fixture, erwartete Vorschlagsfolge eingefroren.
  Damit lässt sich der Umbau aus Teil 1 verifizieren, statt ihn zu glauben.

---

## Teil 3 — Sicherheit (vor jeder Verteilung zu fixen)

### 1. Privilege Escalation über `user_metadata` — kritisch

`withAdminAuth` prüft `user.user_metadata?.role !== 'admin'`. `user_metadata` ist in Supabase
**vom Client selbst beschreibbar**:

```js
await supabase.auth.updateUser({ data: { role: 'admin' } })
```

Jeder registrierte Nutzer kann sich damit zum Admin machen und erreicht dann alle
`withAdminAuth`-Routen (Fahrerverwaltung, Nutzer löschen, Invites erzeugen).
`index.tsx` und `header.tsx` leiten `isAdmin` aus derselben Quelle ab.

→ Rolle nach `app_metadata` (nur mit Service-Role schreibbar) oder in eine `profiles`-Tabelle mit
RLS. Serverseitig ausschließlich diese Quelle prüfen.

### 2. Service-Role-Key mit `NEXT_PUBLIC_`-Präfix — kritisch

`supabaseClientAdmin.ts` liest `process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`.
Next.js inlined jede `NEXT_PUBLIC_*`-Variable zur Buildzeit in jedes Bundle, das sie referenziert.
Heute wird die Datei nur aus API-Routen importiert, der Key ist also (noch) nicht im Client-Bundle —
aber ein einziger versehentlicher Import aus einer Komponente liefert einen Schlüssel aus, der RLS
komplett umgeht und die Auth-Admin-API öffnet.

→ Umbenennen in `SUPABASE_SERVICE_ROLE_KEY`. Zusätzlich `import 'server-only'` in
`supabaseClientAdmin.ts`, damit ein Client-Import zum Buildfehler wird.

### 3. Direkte Client-Schreibzugriffe auf `fahrten` — hoch

`saveTour`, `simulate`, `removeTour` und `resetTours` schreiben mit dem Anon-Key direkt gegen die
Tabelle. `resetTours` ist dabei ein `DELETE` über alle Zeilen:

```js
await supabase.from("fahrten").delete().gt("datum", new Date(0).toISOString());
```

Der Admin-Check dafür sitzt nur im UI (`hidden={!isAdmin}` bzw. Header). Die Datenbank selbst kennt
ihn nicht — jeder eingeloggte Nutzer kann per DevTools-Konsole die gesamte Historie löschen.

→ RLS default-deny auf `fahrten`/`fahrer`, alle Schreibzugriffe über API-Routen mit Rollenprüfung.

### 4. Invite-Codes sind unbegrenzt wiederverwendbar — mittel

`api/invite/register.ts` sucht den Code mit `.eq("code", code)` und prüft weder `used` noch
`expires_at` (beide Spalten existieren). Der Code wird zwar hinterher auf `used = true` gesetzt,
das blockt aber nichts. Ein geleakter Invite mit `role = 'admin'` erzeugt beliebig viele Admins.

→ `.eq("used", false).gt("expires_at", now())` in die Query, Update atomar
(`update … where code = ? and used = false returning *`), Rate-Limit auf den Endpoint.

---

## Reihenfolge

1. Sicherheit 1–4 (unabhängig von allem anderen, klein, blockierend)
2. Vollständige Migrations ins Repo, Versionen pinnen, `.env.example` ergänzen — ab hier ist die App
   überhaupt erst installierbar
3. Golden-Test auf die bestehende Historie
4. `trip_drivers` + `driver_ledger` + `suggest_drivers`, Feature-Flag-Vergleich, Alt-Pfad löschen
5. Stops/Kapazität/Gruppen generalisieren, i18n, PWA
