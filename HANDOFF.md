# Übergabe / Stand der Analyse

Kurzfassung für eine neue Sitzung. Ersetzt das Nachlesen des bisherigen Chats.
Ausführlich: `ARCHITEKTUR-REVIEW.md` (Analyse), `SIMULATION.md` (Messergebnisse).

## Was die App tut

Next.js (Pages Router) + Supabase. Verteilt Fahrten einer Fahrgemeinschaft auf zwei
Etappen: Startpunkt A → Zwischenstopp B → Ziel. Aktuell 3 Fahrer ab A, 1 ab B.
Der Vorschlag ist im UI überschreibbar; das ist gewollt und wird genutzt.

## Kernbefunde

**Der Algorithmus funktioniert.** Über 143 echte Fahrten liegt die Verteilung auf
Etappe 1 bei einer Abweichung von ≤ 0,3 vom Soll. Die Bucket-Zählung nach exakter
Besetzungsmenge ist bei 4 Personen und 11 vorkommenden Besetzungen kein Problem.

**Zwei offene Punkte im Algorithmus:**

1. Der Partial-Match-Fallback in `new_day.tsx` wählt bei mehreren passenden Buckets
   per `.pop()` willkürlich (`// todo: handle multiple partialMatchingQuotes`). In den
   echten Daten griff er 4-mal, nie mehrdeutig. Bei 4 Fahrern ab A wird das relevant.
2. Manuelle Eingriffe gleichen sich aus, aber langsam: nach 20 erzwungenen Fahrten
   braucht das Bucket-Verfahren 111 Fahrten bis zum Ausgleich, ein Saldo-Verfahren 24.
   Grund: die Schuld steckt in *einem* Bucket und kann nur abgetragen werden, wenn
   genau diese Besetzung wiederkommt.

**Fairness am Zwischenstopp ist eine offene Gruppenentscheidung, kein Bug.**
Der B-Fahrer fährt Etappe 2 zu 49 % (27 von 55 Anwesenheitstagen). Das ist exakt das
Soll nach der Regel, die im Code steckt („ankommender Fahrer gegen B-Fahrer, 50/50").
Nach der Alternative „alle Insassen teilen sich die Etappe anteilig" wäre sein Soll
21,8 — dann fährt er rund 5 Fahrten zu viel. Beide Regeln sind vertretbar.
Umschaltbar über `Options.basis` in `src/lib/fairness/model.ts`.

## Sicherheit — behoben auf `hotfix/security`

Alle vier Punkte sind erledigt; die zugehörigen Tests in `tests/schema.test.ts`
sind grün.

1. **Rollenprüfung lag in `user_metadata`** (client-beschreibbar → Selbst-
   ernennung zum Admin). Jetzt `app_metadata`, das nur der Service-Role-Key
   setzen kann — in `withAdminAuth.ts`, `withRoleAuthSsr.ts`, `index.tsx`,
   `users/list.ts`, `users/set-role.ts`, `setup-admin/index.ts` und in der
   Policy `"invites: nur Admins"`. Rollen werden gegen `src/lib/roles.ts`
   geprüft.
2. **`fahrten`, `fahrer` und `invites` waren für `anon` offen.** `0002_security.sql`
   entzieht `anon` sämtliche Rechte inkl. `USAGE ON SCHEMA public`; Fahrer und
   Fahrten sind für `authenticated` freigegeben, `invites` nur für Admins bzw.
   `service_role`. Fünf API-Routen liefen serverseitig über den Modul-Client mit
   anon-Key und hätten danach leere Ergebnisse geliefert — sie nutzen jetzt
   `createApiClient(req)` mit der Sitzung des Aufrufers.
3. **Service-Role-Key** heißt jetzt `SUPABASE_SERVICE_ROLE_KEY` (ohne
   `NEXT_PUBLIC_`, also nicht mehr im Bundle), mit Browser-Guard und
   `persistSession: false`.
4. **Invite-Codes** werden in `api/invite/register.ts` in *einem* Update
   entwertet und dabei auf `used`, `expires_at` und die hinterlegte
   E-Mail geprüft; schlägt das Anlegen fehl, wird der Code wieder freigegeben.

**Beim Ausrollen:** `supabase db push` (oder `0002_security.sql` einspielen),
`SUPABASE_SERVICE_ROLE_KEY` in der Umgebung umbenennen — und alle Nutzer müssen
sich einmal neu anmelden, weil `app_metadata` erst mit dem nächsten Token im JWT
steht.

Offen und bewusst nicht Teil des Hotfix: der Test „kein Set.difference /
Iterator-Helpers" bleibt rot (`new_day.tsx:151`) — das ist Browser-Kompatibilität,
siehe Schritt 4.

## Datenqualität

- 45 von 188 Datensätzen fehlen (ID-Lücken) — vermutlich gelöschte Simulationsläufe.
  Der Zustand zum Entscheidungszeitpunkt ist damit nicht rekonstruierbar.
- Der Algorithmus änderte sich am 15./16.07.2025 (Tiebreak, Partial-Match); die Daten
  beginnen am 19.06.2025.
- Es wird nicht festgehalten, ob der gespeicherte Fahrer der vorgeschlagene war.
  → `suggested_a` / `suggested_b` mitschreiben, Simulationen als `is_simulation`
  markieren statt löschen.

**Folge:** Übereinstimmung mit der Historie taugt nicht als Gütemaß. Bewertet wird
über Soll/Ist (`evaluateFairness`), das nur von Anwesenheit und tatsächlichen Fahrten
abhängt.

## Was schon da ist

```
src/lib/fairness/model.ts     reine Kernlogik, k Etappen, umschaltbarer Maßstab
                              (noch nicht von der App genutzt)
tests/                        56 grüne Verhaltenstests, 8 rote Schema-/Sicherheitstests
scripts/simulate_algorithms.mjs   Verfahrensvergleich, Szenarien basis/stress/real
scripts/replay_check.mjs          Ein-Schritt-Prognose gegen die echte Historie
scripts/override_test.mjs         Selbstkorrektur nach manuellen Eingriffen
supabase/migrations/0001_schema.sql   vollständiges Schema inkl. RLS
tests/fixtures/*.csv          echte Historie als Testfixture
```

`npm test` — braucht Node 22, keine zusätzlichen Abhängigkeiten.

## Nächste Schritte, in dieser Reihenfolge

1. ~~Die vier Sicherheitspunkte.~~ Erledigt auf `hotfix/security`.
2. `trip_drivers(trip_id, leg_seq, member_id)` statt `fahrerA_id`/`fahrerB_id`, dazu
   `driver_ledger` per Trigger. Backfill aus den 143 Fahrten. Damit fällt die
   Zwei-Etappen-Verdrahtung in Schema, SPs, API und UI gleichzeitig weg.
3. App auf `src/lib/fairness/model.ts` umstellen, alte Quotes-Pfade löschen
   (`calc_qoutes.ts`, `quotes_sp.ts`, `quotes_zw.ts`, beide `get_unique_*`-SPs).
4. Verteilbarkeit: Versionen pinnen (`next`/`react` stehen auf `latest`),
   `.env.example` vervollständigen, `Set.difference`/Iterator-Helpers ersetzen
   (erst ab Chrome 122 / Safari 17.4), i18n, `group_id` für Mehrmandantenfähigkeit.
