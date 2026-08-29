# Fahrgemeinschaftsplaner

*[English version: README.md](README.md)*

Eine kleine, selbst gehostete Web-App, die entscheidet, **wer heute fährt** — und dafür sorgt, dass
sich das über die Zeit ausgleicht.

Die Gruppe fährt eine feste Strecke mit einem Zwischenstopp:

```
Startpunkt (A)  ──── Etappe 1 ────►  Zwischenstopp (B)  ──── Etappe 2 ────►  Ziel
```

Wer an A zusteigt, fährt beide Etappen mit; wer an B zusteigt, nur Etappe 2. Für jede Fahrt schlägt
die App pro Etappe einen Fahrer vor — auf Basis der Anwesenden und der Frage, wie oft wer in genau
dieser Besetzung schon gefahren ist. Jeder Vorschlag lässt sich im UI überschreiben; das ist so
gewollt und wird in der Praxis regelmäßig genutzt.

Umgesetzt mit Next.js und Supabase. Jede Gruppe betreibt ihre eigene Instanz — es gibt keinen
gemeinsamen Dienst und keine zentrale Datenbank.

---

## Inhalt

- [Funktionsumfang](#funktionsumfang)
- [Wie der Vorschlag zustande kommt](#wie-der-vorschlag-zustande-kommt)
- [Technik](#technik)
- [Schnellstart](#schnellstart)
- [Supabase einrichten](#supabase-einrichten)
- [Umgebungsvariablen](#umgebungsvariablen)
- [Deployment](#deployment)
- [Als App installieren](#als-app-installieren)
- [Entwicklung](#entwicklung)
- [Projektaufbau](#projektaufbau)
- [Datenmodell](#datenmodell)
- [Bekannte Grenzen](#bekannte-grenzen)
- [Sicherheit](#sicherheit)
- [Lizenz](#lizenz)

---

## Funktionsumfang

- **Fahrervorschlag pro Etappe** — einer ab Startpunkt, einer ab Zwischenstopp
- **Anwesenheitsgerechte Verteilung** — man schuldet nur Fahrten, bei denen man dabei war
- **Manuelles Überschreiben** — der Vorschlag ist ein Vorschlag; Korrekturen fließen in die
  Statistik zurück
- **Fahrtenhistorie** mit Nachladen, Bearbeiten und Löschen
- **Fahrerverwaltung** (Name, Kürzel, Zustiegspunkt)
- **Benutzerverwaltung** mit den Rollen `user` und `admin`
- **Einladungscodes** — optional an eine E-Mail-Adresse und/oder ein Ablaufdatum gebunden, einmalig
  einlösbar
- **Einmaliger Setup-Assistent** für das erste Admin-Konto
- **Als App installierbar (PWA)** — Homescreen-Icon, eigenes Fenster, Offline-Hinweis
- **Backup-Skript** für einen vollständigen logischen Dump der Datenbank

Die Oberfläche ist derzeit **nur auf Deutsch**; Internationalisierung steht auf der Liste.

## Wie der Vorschlag zustande kommt

Für jede Etappe zählt die App, wie oft jeder Fahrberechtigte **innerhalb der exakt gleichen
Anwesenheitsmenge** schon gefahren ist. Vorgeschlagen wird das Minimum. Bei Gleichstand entscheidet
der längere Abstand zur letzten Fahrt, danach die kleinere ID.

Die Zählung je exakter Besetzung — statt eines einzigen globalen Zählers — ist der Grund, warum
sich das Ergebnis bei wechselnder Gruppenzusammensetzung fair anfühlt: Wer selten dabei ist,
sammelt während seiner Abwesenheit keine künstliche Schuld an.

Gemessen an 143 echten Fahrten liegt die Verteilung auf Etappe 1 höchstens **0,3 Fahrten** vom Soll
entfernt.

Eine verallgemeinerte, etappenbasierte Neufassung dieser Logik liegt in
[`src/lib/fairness/model.ts`](src/lib/fairness/model.ts). Sie beherrscht beliebig viele Etappen und
einen umschaltbaren Maßstab, ist durch Tests abgedeckt, wird aber **von der App noch nicht
genutzt** — siehe [Bekannte Grenzen](#bekannte-grenzen).

## Technik

| Schicht | Auswahl |
|---|---|
| Framework | Next.js 15 (Pages Router), React 19, TypeScript 5.8 |
| UI | Bootstrap 5 / react-bootstrap |
| Backend | Next.js API-Routen (`src/pages/api`) |
| Datenbank & Auth | Supabase (PostgreSQL, Row Level Security, Supabase Auth) |
| Tests | Node-eigener Test-Runner (`node --test`), keine Zusatzabhängigkeiten |

Benötigt **Node.js 22 oder neuer** — die Tests laufen über `--experimental-strip-types`.

---

## Schnellstart

```bash
git clone git@github.com:Mike-F362/carpool-nextjs.git
cd carpool-nextjs
npm ci

cp .env.example.local .env.local   # danach Supabase-Werte eintragen
npm run dev                        # http://localhost:3000
```

Ohne eingerichtetes Supabase-Projekt startet die App zwar, kann aber niemanden anmelden. Zuerst die
Einrichtung unten durcharbeiten.

## Supabase einrichten

### 1. Projekt anlegen

Neues Projekt auf [supabase.com](https://supabase.com) anlegen — der kostenlose Tarif reicht für
eine Gruppe dieser Größe. Eine Region in der Nähe wählen; sie lässt sich **später nicht ändern**.
Unter **Project Settings → API** stehen die drei benötigten Werte:

| Wert | Verwendung als | Sichtbarkeit |
|---|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` | öffentlich |
| `anon` public key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | öffentlich, landet im Client-Bundle — so vorgesehen |
| `service_role` key | `SUPABASE_SERVICE_ROLE_KEY` | **geheim**, umgeht Row Level Security vollständig |

> Dem Service-Role-Key **niemals** ein `NEXT_PUBLIC_`-Präfix geben. Das Präfix inlined den Wert in
> jedes Client-Bundle, das ihn referenziert — und gibt damit jedem, der die Seite öffnet, vollen
> Datenbankzugriff.

### 2. Schema einspielen

Zwei Migrationen, **beide nötig, in dieser Reihenfolge**:

| Datei | Inhalt |
|---|---|
| [`supabase/migrations/0001_schema.sql`](supabase/migrations/0001_schema.sql) | Tabellen, Sequenzen, Constraints und die Stored Procedures |
| [`supabase/migrations/0002_security.sql`](supabase/migrations/0002_security.sql) | Rechte, RLS-Policies, Rollenbehandlung |

Nach `0001` allein hat außer `service_role` niemand Zugriff — die App funktioniert erst, wenn auch
`0002` eingespielt ist.

**Variante A — SQL-Editor:** Supabase-Dashboard → *SQL Editor*, den Inhalt beider Dateien
nacheinander einfügen und ausführen.

**Variante B — Supabase CLI** (das Repo enthält eine [`supabase/config.toml`](supabase/config.toml)):

```bash
supabase link --project-ref <projekt-ref>
supabase db push
```

Beide Migrationen sind idempotent und lassen sich auf einer bestehenden Datenbank erneut ausführen.

> **Auf einer Datenbank, die älter ist als das Migrationsverzeichnis,** reicht `supabase db push`
> nicht: Es spielt `0001_schema.sql` erneut ein, dessen `ADD CONSTRAINT`-Anweisungen an bereits
> vorhandenen Constraints scheitern. Vorher die Basis als angewendet markieren
> (`supabase migration repair --status applied 0001`) oder `0002_security.sql` direkt gegen die
> Datenbank laufen lassen.

Die einzelnen `.sql`-Dateien unter `supabase/` sind die Stored Procedures zum Nachschlagen. Sie
stecken bereits in `0001_schema.sql` und müssen nicht separat ausgeführt werden.

### 3. Umgebungsvariablen setzen

```bash
cp .env.example.local .env.local
```

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<projekt-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

`.env.local` ist von git ausgenommen.

### 4. Ersten Admin anlegen

App starten und **`/setup`** aufrufen. Das Formular legt den ersten Benutzer mit
`app_metadata.role = "admin"` an.

Die Route sperrt sich selbst, sobald **irgendein** Benutzer existiert — `/api/setup-admin`
verweigert einen zweiten Durchlauf. Soll das Setup wiederholt werden, vorher im Dashboard unter
*Authentication → Users* alle Benutzer löschen.

### 5. Fahrer anlegen und die Gruppe einladen

Als Admin:

1. **`/fahrer_admin`** — je Person einen Eintrag: Name, Kürzel und Zustiegspunkt (`1` = Startpunkt,
   `2` = Zwischenstopp). Nur wer hier steht, kann als Fahrer vorgeschlagen werden.
2. **`/invite_admin`** — Einladungscodes erzeugen. Ein Code lässt sich auf eine E-Mail-Adresse
   festlegen, mit Ablaufdatum versehen und trägt die Rolle, die das neue Konto erhält. Jeder Code
   ist genau einmal einlösbar.
3. Einladungslink verschicken. Die Registrierung läuft über **`/register`**. Deren Endpunkt
   `/api/invite/register` ist eine von nur zwei API-Routen, die die Middleware ohne Sitzung
   durchlässt — deshalb wird der Code vollständig im Handler geprüft.
4. **`/user_admin`** — Rollen später ändern oder Konten entfernen.

> **Hinweis beim Aktualisieren einer bestehenden Installation:** Die Rolle ist von `user_metadata`
> nach `app_metadata` gewandert. `app_metadata` landet erst beim nächsten Token-Refresh im JWT —
> bestehende Sitzungen müssen sich einmal neu anmelden, sonst greifen die Adminrechte für sie noch
> nicht. Die Migration überträgt vorhandene Rollen selbst; von Hand ist nichts neu zu vergeben.

## Umgebungsvariablen

| Variable | Pflicht | Beschreibung |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ja | URL des Supabase-Projekts |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ja | Öffentlicher anon-Key, unterliegt der RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | ja | Geheimer Key für serverseitige Admin-Operationen (Benutzer anlegen, Einladungen, Rollen) |
| `SUPABASE_DB_URL` | nein | Direkte Postgres-Verbindung, nur für `scripts/dump_db.sh` / `.cmd` |
| `NEXT_PUBLIC_APP_VERSION` | automatisch | Wird von `scripts/postbuild.js` beim Build gesetzt |
| `NEXT_PUBLIC_GIT_TAG` | automatisch | Letzter Git-Tag, gleiches Skript |
| `NEXT_PUBLIC_COMMIT_HASH` | automatisch | Kurzer Commit-Hash, gleiches Skript |

Die letzten drei erscheinen im Header und werden automatisch gesetzt — nicht von Hand pflegen.

## Deployment

Jeder Host, der Next.js ausführt, funktioniert. Auf **Vercel**:

1. GitHub-Repository importieren.
2. Die Umgebungsvariablen unter *Settings → Environment Variables* eintragen. Nur
   `SUPABASE_SERVICE_ROLE_KEY` muss als sensibel markiert werden; die beiden
   `NEXT_PUBLIC_`-Werte sind bewusst öffentlich.
3. Deployen. Build-Kommando `npm run build`, sonst keine Konfiguration nötig.

Änderungen an Umgebungsvariablen erreichen bestehende Deployments nicht — danach neu deployen.

> **Stolperstelle beim Build:** Trotz des Namens läuft `scripts/postbuild.js` **vor** `next build`
> (`"build": "node scripts/postbuild.js && next build"`). Das Skript schreibt die drei
> Versionsvariablen in `.env.local`, damit `next build` sie einlesen kann. Auf einem Host ohne
> Git-Historie bleiben Tag und Hash schlicht leer; der Build läuft trotzdem durch.

## Als App installieren

Die App ist eine Progressive Web App — kein Store, kein nativer Build, keine zusätzliche
Abhängigkeit.

**iOS/iPadOS:** Seite in Safari öffnen → *Teilen* → *Zum Home-Bildschirm*.
**Android:** in Chrome öffnen → *⋮* → *App installieren* (oder die Einblendung bestätigen).

Danach gibt es ein Homescreen-Icon und ein eigenes Fenster ohne Browserleiste. Der Service Worker
([`public/sw.js`](public/sw.js)) hält die Build-Dateien vor, wodurch wiederholte Starts schneller
sind, und zeigt ohne Verbindung [`public/offline.html`](public/offline.html) statt der
Browser-Fehlerseite.

**Bewusst nicht weiter offline-fähig.** Die Fahrten liegen in Supabase und werden immer live
geholt; `/api/*`-Antworten werden nie zwischengespeichert, weil sie an der Sitzung hängen. Offline
gibt es einen sauberen Hinweis statt veralteter Daten.

Hinweise:

- Ein Service Worker läuft nur über **HTTPS** (oder auf `localhost`). Registriert wird er
  ausschließlich im Produktionsbuild — im `next dev` käme sich der Asset-Cache mit dem Hot Reload
  in die Quere.
- Nach einem Deployment übernimmt eine laufende App die neue Version beim nächsten Start.
- Wenn du die Caching-Regeln änderst: `CACHE_VERSION` in `public/sw.js` erhöhen, alte Caches werden
  beim Aktivieren gelöscht.

## Entwicklung

```bash
npm run dev          # Entwicklungsserver auf :3000
npm test             # Verhaltenstests: Algorithmus, Invarianten, echte Historie (Node 22+)
npm run test:schema  # Schema, Konfiguration und Browser-Kompatibilität
npm run test:watch   # Watch-Modus
npm run typecheck    # tsc --noEmit
npm run lint         # Biome: Format und Regeln, eine Zeile je Regel
npm run lint:details # dasselbe mit der vollstaendigen Ausgabe
npm run lint:fix     # wendet die sicheren Korrekturen an
npm run format       # nur der Formatter
npm run build        # Produktionsbuild
```

### Lint und Formatierung

[Biome](https://biomejs.dev) deckt beides ab, aus einer einzigen
[`biome.json`](biome.json). Die CI ruft `biome ci` auf, das Format und Regeln in
einem Lauf prüft, ohne etwas zu ändern: Als Fehler markierte Funde brechen den
Build ab, Warnungen bleiben im Log sichtbar.

Drei Regeln weichen bewusst von den Standardwerten ab:

| Regel | Einstellung | Grund |
|---|---|---|
| `noNonNullAssertion` | aus | fast jeder Treffer ist `process.env.NEXT_PUBLIC_SUPABASE_URL!` — genau so ist der Supabase-Client dokumentiert |
| `noExplicitAny` | Warnung | 28 Stellen; sie zu typisieren ist dieselbe Arbeit wie `strict` in der tsconfig einzuschalten und gehört in eine eigene Änderung |
| `useExhaustiveDependencies` | Warnung | eine ergänzte Abhängigkeit ändert, wann ein Effekt läuft — auf der Startseite ist das die Ladereihenfolge von Fahrten und Quoten; jeder Fall will gelesen werden, nicht pauschal korrigiert |

Der Formatter folgt dem, was der Code ohnehin tat (vier Leerzeichen, doppelte
Anführungszeichen, Semikolons). Der eine Commit, der den Baum umformatiert hat,
steht in [`.git-blame-ignore-revs`](.git-blame-ignore-revs); mit
`git config blame.ignoreRevsFile .git-blame-ignore-revs` bleibt er aus
`git blame` heraus.

### Tests

| Suite | Zweck |
|---|---|
| `tests/unit.test.ts` | Verhalten des Algorithmus |
| `tests/property.test.ts` | Invarianten über erzeugte Eingaben |
| `tests/golden.test.ts` | Replay gegen die echte Historie in `tests/fixtures/` |
| `tests/quotes.test.ts` | die Quotengruppierung gegen eine Referenzimplementierung |
| `tests/schema.test.ts` | Leitplanken für Schema, Konfiguration und Browser-Kompatibilität |

`npm test` deckt die ersten vier ab, `npm run test:schema` die letzte. Alle sind grün und
blockieren die CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)), die zusätzlich bei
jedem Push und Pull Request `tsc` ausführt.

Die Schema-Suite lohnt einen Blick: Sie prüft Eigenschaften, die sich leicht versehentlich
kaputtmachen lassen — keine Zugangsdaten im Repository, der Service-Role-Key ohne
`NEXT_PUBLIC_`-Präfix, Rollen aus `app_metadata` statt `user_metadata`, und keine JS-Methoden in
`src/`, die ältere Handy-Browser nicht kennen.

### Skripte

```bash
node scripts/simulate_algorithms.mjs   # Verfahrensvergleich (basis/stress/real)
node scripts/replay_check.mjs          # Ein-Schritt-Prognose gegen die echte Historie
node scripts/override_test.mjs         # Selbstkorrektur nach manuellen Eingriffen

scripts/dump_db.sh                     # vollständiges logisches Backup (Rollen, Schema, Daten)
scripts/dump_db.sh --local             # gegen eine lokale `supabase start`-Instanz
```

`dump_db` braucht die Supabase CLI und `SUPABASE_DB_URL` und schreibt drei Dateien — Rollen, Schema
und Daten lassen sich nur in dieser Reihenfolge zurückspielen.

## Projektaufbau

```
src/
  pages/                 Routen (Pages Router)
    index.tsx            Hauptansicht: Fahrtenliste + neue Fahrt
    setup.tsx            einmaliger Assistent für den ersten Admin
    register.tsx         Einladungscode einlösen
    fahrer_admin.tsx     Fahrerverwaltung
    user_admin.tsx       Benutzer- und Rollenverwaltung
    invite_admin.tsx     Einladungscodes
    api/                 API-Routen (fahrer, tours, users, invite, setup-admin)
    _app.tsx             globale Styles, Service-Worker-Registrierung
    _document.tsx        HTML-Grundgerüst, Icons, Manifest-Verweis
  components/            UI-Komponenten (new_day, tour_table, header, Modals)
  lib/
    supabase/            SSR-fähige Clients (Browser, Server, API-Routen)
    supabaseClientAdmin  Service-Role-Client — ausschließlich serverseitig
    middleware/          Sitzungserneuerung, Admin-Schutz
    fairness/model.ts    verallgemeinertes Etappenmodell (noch nicht von der App genutzt)
    roles.ts             zulässige Rollen
  interfaces/            gemeinsame Typen
public/
  manifest.json          PWA-Metadaten
  sw.js                  Service Worker (Asset-Cache, Offline-Fallback)
  offline.html           Seite ohne Verbindung
supabase/
  migrations/            0001_schema.sql, 0002_security.sql
  *.sql                  einzelne Stored Procedures (Referenzkopien)
scripts/                 Build-, Backup- und Analyseskripte
tests/                   Testsuites und CSV-Fixtures
```

`src/middleware.ts` greift auf `/api/:path*` und erneuert bei jedem API-Aufruf die
Supabase-Sitzung. Nicht angemeldete Aufrufe werden mit `401` abgewiesen — Ausnahme sind die zwei
Routen auf der Allowlist in `src/lib/middleware/checkAuth.ts` (`/api/invite/register` und
`/api/setup-admin`), die ihre Berechtigung jeweils selbst prüfen. Serverseitige API-Routen nutzen
`createApiClient(req)` mit der Sitzung des Aufrufers statt des Modul-Clients.

## Datenmodell

Drei Tabellen:

**`fahrer`** — Fahrberechtigte

| Spalte | Typ | Bedeutung |
|---|---|---|
| `id` | bigint | Identity |
| `name` | text | Anzeigename |
| `label` | text | Kürzel, eindeutig |
| `startpunkt` | smallint | `1` = Startpunkt, `2` = Zwischenstopp |

**`fahrten`** — Fahrten

| Spalte | Typ | Bedeutung |
|---|---|---|
| `id` | bigint | Identity |
| `datum` | date | Datum der Fahrt |
| `anwesend_ids` | jsonb | Liste der an dem Tag anwesenden `fahrer.id` |
| `fahrerA_id` | bigint | Fahrer der Etappe 1 |
| `fahrerB_id` | bigint | Fahrer der Etappe 2 |

**`invites`** — Einladungscodes (`code`, `used`, `used_by`, `email`, `role`, `expires_at`)

## Bekannte Grenzen

Ehrliche Liste dessen, was diese Version *nicht* kann.

1. **Genau zwei Etappen sind fest verdrahtet.** `fahrerA_id` / `fahrerB_id` sind Spalten, und
   `startpunkt ∈ {1, 2}` steckt in Stored Procedures, API und UI. Ein dritter Zustieg ist nicht
   additiv einbaubar.
2. **Die Zahl der Zähl-Buckets wächst mit 2ⁿ.** Ein Topf je Anwesenheitsmenge heißt: die meisten
   Töpfe enthalten ein bis zwei Fahrten, und zwischen ihnen findet kein Wissenstransfer statt. Der
   Partial-Match-Fallback in `new_day.tsx` wählt bei mehreren passenden Teilmengen willkürlich per
   `.pop()`. Bei drei Fahrern ab A unkritisch, ab vier relevant.
3. **Manuelle Eingriffe gleichen sich nur langsam aus.** Nach 20 erzwungenen Fahrten braucht das
   Bucket-Verfahren rund 111 Fahrten bis zum Ausgleich, ein Saldo-Verfahren rund 24 — die Schuld
   steckt in *einem* Bucket und wird nur abgetragen, wenn genau diese Besetzung wiederkommt.
4. **Kapazität ist nicht modelliert.** Sitzplätze kommen nirgends vor; das Schema kann zwei Fahrer
   auf einer Etappe nicht ausdrücken.
5. **Die Quotenberechnung läuft im Serverprozess, nicht in der Datenbank.** Jede Route liest die
   Fahrten einmal und bildet alle Töpfe in einem Durchlauf — eine Abfrage statt eines Dutzends.
   Die Aggregation selbst bleibt aber Arbeit von Node, während ein `GROUP BY` sie in Postgres
   erledigen und ein paar Dutzend Zeilen statt der Tabelle zurückgeben würde. Über das, was im
   Browser ankommt, sagt das nichts: `/api/fahrer/quotes_sp` und `quotes_zw` antworten
   ausschließlich mit der fertigen Quotenzuordnung. Die Fahrtenliste, die der Browser sehr wohl
   bekommt, stammt aus `/api/tours/list` und ist genau das, was die Tabelle anzeigt.

   **Das hat eine Obergrenze.** PostgREST deckelt jedes Resultset bei `max_rows` — Vorgabe 1000,
   sowohl in [`supabase/config.toml`](supabase/config.toml) als auch im gehosteten Projekt. Die
   Fahrten zu lesen heißt, *alle* zu lesen; ab Fahrt 1001 würden die Quoten also stillschweigend
   auf einer abgeschnittenen Tabelle berechnet — keine Fehlermeldung, nur ein leise falscher
   Vorschlag. Bei rund 220 Fahrten im Jahr ist das etwa viereinhalb Jahre entfernt. Die Grenze
   hochzusetzen verschafft Zeit; in der Datenbank zu aggregieren beseitigt das Problem, weil das
   Ergebnis dann unabhängig von der Länge der Historie eine Handvoll Zeilen ist.
6. **Eine Gruppe je Instanz.** Kein `group_id`, keine Mandantenfähigkeit.
7. **Oberfläche nur auf Deutsch**, keine i18n-Schicht.
8. **Das verallgemeinerte Modell ist nicht angeschlossen.** `src/lib/fairness/model.ts` beherrscht
   k Etappen und einen umschaltbaren Maßstab (`Options.basis`) und ist durch Tests abgedeckt — die
   App nutzt weiterhin die alten Quotes-Pfade.
9. **Einschränkung bei den Daten:** 45 von 188 historischen Datensätzen fehlen (gelöschte
   Simulationsläufe), und es wurde nie festgehalten, ob der gespeicherte Fahrer der vorgeschlagene
   war. Übereinstimmung mit der Historie taugt deshalb nicht als Gütemaß — bewertet wird über
   Soll/Ist (`evaluateFairness`).

**Fairness am Zwischenstopp ist eine offene Gruppenentscheidung, kein Fehler.** Der B-Fahrer fährt
Etappe 2 an 49 % seiner Anwesenheitstage — exakt das Soll nach der Regel, die im Code steckt
(„ankommender Fahrer gegen wartenden Fahrer, 50/50"). Nach der Alternative „alle Insassen teilen
sich die Etappe anteilig" läge sein Soll niedriger. Beide Regeln sind vertretbar; umgeschaltet wird
über `Options.basis` in `src/lib/fairness/model.ts`.

## Sicherheit

- Die Rolle liegt ausschließlich in `app_metadata` (nur mit dem Service-Role-Key schreibbar) —
  vorher in `user_metadata`, das der Client per `auth.updateUser()` selbst beschreiben kann
- `anon` hat im Schema `public` keine Rechte; RLS-Policies beschränken `fahrer` und `fahrten` auf
  angemeldete Nutzer und `invites` auf Admins
- Der Service-Role-Key trägt kein `NEXT_PUBLIC_`-Präfix, wird nur serverseitig gelesen und läuft
  mit `persistSession: false`
- Einladungscodes werden atomar entwertet und gegen `used`, `expires_at` und die hinterlegte
  E-Mail-Adresse geprüft; unbekannte, benutzte und abgelaufene Codes liefern dieselbe Meldung,
  damit sich fremde Codes nicht abfragen lassen

Beim Selbsthosten bitte prüfen, dass `0002_security.sql` wirklich eingespielt wurde — im
Supabase-Dashboard unter *Authentication → Policies* darf für `fahrten` keine Policy mit
`USING (true)` stehen.

Etwas gefunden? Bitte ein Issue unter
[Mike-F362/carpool-nextjs](https://github.com/Mike-F362/carpool-nextjs/issues) anlegen — bei
Sicherheitsproblemen ohne öffentlichen Proof of Concept.

## Mitwirken

Pull Requests sind willkommen. `npm test`, `npm run test:schema` und `npm run typecheck` sollten
grün bleiben; die CI prüft alle drei.

## Lizenz

[Apache License 2.0](LICENSE) — freie Nutzung, Änderung und Selbsthosting, auch kommerziell, mit
Patentlizenz und Namensnennungspflicht.
