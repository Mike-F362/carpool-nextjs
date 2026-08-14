# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Entries up to 1.0.6 were reconstructed from the git history; the project had no
changelog while it was still a single-group prototype.

## [1.2.0] - 2026-08-14

### Added

- Bilingual README (`README.md`, `README_de.md`): what the app does, how the
  driver proposal works, a step-by-step Supabase setup, deployment, the data
  model and an honest list of the known limitations.
- Apache 2.0 `LICENSE`.
- Installable as an app (PWA). The web manifest carries a name, `start_url` and
  `scope`; `public/sw.js` caches the immutable build assets and answers
  navigations without a connection with `public/offline.html`. `/api/*` and
  Supabase are never cached, because those responses depend on the session — the
  app stays online-only by design, it merely fails more gracefully.
- `npm run test:schema` as a script of its own, so the schema and security suite
  can be run without the behaviour tests.
- Biome as linter and formatter (`npm run lint`, `npm run lint:fix`,
  `npm run format`), checked in CI with `biome ci`. `noNonNullAssertion` is off
  because the Supabase clients are documented that way; `noExplicitAny` and
  `useExhaustiveDependencies` warn rather than fail, because both are their own
  piece of work and neither should hold up the rest.
- Backup script (`scripts/dump_db.sh`, `scripts/dump_db.cmd`) writing roles,
  schema and data as three files — the only order in which they restore. It runs
  pg_dump through the Supabase CLI in a container matching the server version and
  needs `SUPABASE_DB_URL` pointing at the session pooler on port 5432; the
  transaction pooler on 6543 cannot serve pg_dump.

### Fixed

- Fifteen buttons carried no `type`. Inside a form the default is `submit`, so a
  button with nothing but an `onClick` could submit the form around it — which is
  where the delete buttons in the driver, invite and user tables sit.
- Two labels in the login modal were not connected to their input, so tapping the
  caption did not focus the field and a screen reader announced an unlabelled
  input.
- The driver lookup compared with `==` while the ids from `anwesend_ids` come out
  of jsonb and are not reliably numbers. Both sides are now converted explicitly,
  which keeps the result for mixed types instead of changing the proposal.
- `/setup` was unreachable on a fresh installation. The auth middleware rejected
  every unauthenticated `/api` call except `/register`, so `/api/setup-admin`
  answered `401` in exactly the situation it exists for — before the first user
  exists. The suffix comparison is now an explicit allowlist, which also closes
  the side effect that any route ending in `/register` would have been let
  through.
- The trip form used iterator helpers (`map.keys().filter(…)`) and
  `Set.prototype.difference` / `.intersection`, available from Chrome 122,
  Safari 17.4 and Firefox 127 onwards; older phones ran into a `TypeError`. This
  matters now that the app is meant to live on a home screen.
- `npm test` pointed at the `tests/` directory, which Node 22.22 does not resolve
  as a test target. The scripts name the files, the way CI already did.

### Changed

- The quota routes read the trips once and bucket them in a single pass.
  `quotes_sp` previously issued one query per attendance set and `quotes_zw` one
  per driver *and* set, each fetching the whole table and filtering it down to a
  single bucket — nine and fourteen requests per page load against the current
  history, where one each is enough. `tests/quotes.test.ts` pins the result
  against the previous implementation over the real 143 trips.
- The schema and security suite no longer runs with `continue-on-error` in CI.
  Every finding it documented is closed, so it gates the build like any other
  suite.
- CI calls `npm test` and `npm run test:schema` instead of repeating the file
  lists.
- Line endings are normalised per file type (`.gitattributes`). A batch file
  checked out with LF breaks, because cmd.exe locates `GOTO` targets by byte
  offset; the fixture CSVs are pinned to LF, because the readers in the golden
  tests split on `"\n"` and a stray CR would land in the last field of every row.
  The fixtures are renormalised along with the rule.

## [1.1.0] - 2026-08-13

### Security

- Roles are read from `app_metadata` instead of `user_metadata`. `user_metadata`
  is writable by the client through `auth.updateUser()`, so any signed-in user
  could promote themselves to admin. Affects `withAdminAuth`, `withRoleAuthSsr`,
  the admin policy on `invites` and every place that assigns a role; role values
  are validated against `src/lib/roles.ts`.
- `anon` no longer has any rights in schema `public`. Previously `fahrten`
  carried `USING (true)` plus `GRANT ALL TO anon` — reading, writing and deleting
  without signing in, using nothing but the public anon key; `fahrer` and
  `invites` were readable, invite codes included. `0002_security.sql` grants
  `fahrer`/`fahrten` to `authenticated` and `invites` to admins and
  `service_role` only.
- `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` renamed to `SUPABASE_SERVICE_ROLE_KEY`.
  The prefix inlined the key that bypasses RLS into every bundle referencing the
  variable. Added a browser guard and `persistSession: false`.
- Invite codes are claimed in a single update that also checks `used`,
  `expires_at` and the bound e-mail address; the code is released again if
  account creation fails. Unknown, used and expired codes return one identical
  error so codes cannot be probed.

### Added

- Test suite: behaviour tests for the algorithm, invariants, a replay against the
  real trip history, and a schema and security suite, with the history as a CSV
  fixture.
- Simulation scripts comparing assignment strategies, replaying the history and
  measuring how fast manual overrides even out again.
- CI workflow running the behaviour tests, the schema and security suite and the
  type check.

### Changed

- Five API routes now use `createApiClient(req)` with the caller's session
  instead of the module client with the anon key — after the `anon` lockdown they
  would otherwise have returned empty results.
- Next.js 15.5.23 (maintenance LTS), React and React DOM 19.1.9.

### Upgrade notes

- Apply `0002_security.sql` and rename `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` to
  `SUPABASE_SERVICE_ROLE_KEY` in the environment, then redeploy — environment
  changes do not reach deployments that already exist.
- `supabase db push` alone is not enough on a database that predates the
  migration directory: it would replay `0001_schema.sql`, whose `ADD CONSTRAINT`
  statements fail against constraints that already exist. Mark the baseline as
  applied first (`supabase migration repair --status applied 0001`), or run
  `0002_security.sql` directly against the database.
- The migration moves existing roles from `user_metadata` to `app_metadata` by
  itself; no manual reassignment is needed. Everyone has to sign in once
  afterwards, because `app_metadata` only reaches the JWT with the next token.

### Note on the diagnosis

Fairness at the intermediate stop was suspected to be a bug and is not one. The
driver waiting at B covers leg 2 on 49 % of the days he is present (27 of 55) —
exactly the target under the rule encoded in the app ("arriving driver against
waiting driver, 50/50"). Under the alternative rule "all passengers share the leg
proportionally" his target would be 21.8, making him about five trips short.
Both rules are defensible; the choice is a decision for the group and can be
switched via `Options.basis` in `src/lib/fairness/model.ts`.

## [1.0.6] - 2025-07-16

### Fixed

- Reload the quotas after a trip was deleted, so the proposal reflects the
  current history.

## [1.0.5] - 2025-07-16

### Fixed

- Evaluate `partialMatchingQuotes` for the start point as well, not just for the
  intermediate stop.

## [1.0.4] - 2025-07-15

### Added

- Definitions of the stored procedures and of the `invites` table are kept in the
  repository.

### Changed

- Ties between equal quotas are broken by the date of the last trip driven.
- More detail in the error log on the start page.

## [1.0.3] - 2025-07-15

### Fixed

- The registration API is reachable without a session again — the auth middleware
  had locked out the very route needed to create an account.
- Attendance IDs are sorted numerically instead of as strings, which had produced
  wrong buckets.

## [1.0.2] - 2025-07-13

### Added

- User management with a `User` type, an admin Supabase client and deletion of
  accounts.
- Auth check for API routes via Supabase middleware, restricted to `/api`.
- Loading spinner for the trip table.

### Changed

- `@supabase/auth-helpers-nextjs` replaced by `@supabase/ssr`.
- `withRoleAuth` replaced by `withRoleAuthSsr`.
- `user.id` typed as string (it is a UUID).

### Removed

- Single-quota calculation and unused modules under `src/lib`.

## [1.0.1] - 2025-07-08

### Added

- Cookie-based session handling (`nookies`), so admin pages can enforce
  authentication on the server.

### Changed

- The start-point quotas are hidden when only one candidate is available.

### Fixed

- Sort key of the quota list.

## [1.0.0] - 2025-07-04

First working version, in daily use by one group.

### Added

- Driver proposal per leg, based on attendance and on how often each person has
  already driven in exactly this constellation.
- Manual override of the proposal; corrections feed back into the statistics.
- Trip table with paging, editing, deletion and highlighting of the trips that
  affect the current calculation.
- Driver management (name, label, home stop) and user management with `user` and
  `admin` roles.
- Invite links, optionally bound to an e-mail address, with prefilled
  registration.
- Version display in the header, generated at build time.
- Bootstrap UI, favicons.
