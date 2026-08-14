# Carpool Scheduler

*[Deutsche Version: README_de.md](README_de.md)*

A small self-hosted web app that decides **who drives today** in a recurring carpool — and keeps
it fair over time.

The group travels a fixed route with an intermediate stop:

```
Start (A)  ──── leg 1 ────►  Intermediate stop (B)  ──── leg 2 ────►  Destination
```

People boarding at A ride both legs; people boarding at B ride only leg 2. For each trip the app
proposes one driver per leg, based on who is present and how often each person has already driven
in that exact constellation. Every proposal can be overridden in the UI — that is intentional and
happens regularly in practice.

Built with Next.js and Supabase. Each group runs its own instance; there is no shared service and
no central database.

---

## Table of contents

- [Features](#features)
- [How the assignment works](#how-the-assignment-works)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Supabase setup](#supabase-setup)
- [Environment variables](#environment-variables)
- [Deployment](#deployment)
- [Install as an app](#install-as-an-app)
- [Development](#development)
- [Project layout](#project-layout)
- [Data model](#data-model)
- [Known limitations](#known-limitations)
- [Security](#security)
- [License](#license)

---

## Features

- **Driver proposal per leg** — one driver from the start point, one from the intermediate stop
- **Attendance-aware fairness** — you only owe driving duty for trips you were actually part of
- **Manual override** — the proposal is a suggestion, not a rule; corrections feed back into the
  statistics
- **Trip history** with paging, editing and deletion
- **Driver management** (name, label, home stop)
- **User management** with `user` / `admin` roles
- **Invite codes** — optionally bound to an e-mail address and/or an expiry date, single use
- **One-time setup wizard** for the first admin account
- **Installable as an app (PWA)** — home screen icon, standalone window, offline notice
- **Backup script** for a full logical dump of the database

The UI is currently **German only**; internationalisation is on the roadmap.

## How the assignment works

For each leg, the app counts how often every eligible person has driven **within the exact set of
people present**. The person with the lowest count is proposed. Ties are broken by the longest
time since that person last drove, then by the lowest ID.

Counting per exact attendance set — rather than a single global counter — is what makes the result
feel fair when the group composition changes from day to day: someone who is rarely present does
not accumulate an artificial deficit while away.

Measured against 143 real trips, the distribution on leg 1 deviates by no more than **0.3 trips**
from the ideal.

A generalised, leg-based reimplementation of this logic lives in
[`src/lib/fairness/model.ts`](src/lib/fairness/model.ts). It handles any number of legs and a
switchable fairness basis, is covered by tests, but is **not yet wired into the app** — see
[Known limitations](#known-limitations).

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (Pages Router), React 19, TypeScript 5.8 |
| UI | Bootstrap 5 / react-bootstrap |
| Backend | Next.js API routes (`src/pages/api`) |
| Database & auth | Supabase (PostgreSQL, Row Level Security, Supabase Auth) |
| Tests | Node built-in test runner (`node --test`), no extra dependencies |

Requires **Node.js 22 or newer** — the test setup relies on `--experimental-strip-types`.

---

## Quick start

```bash
git clone git@github.com:Mike-F362/carpool-nextjs.git
cd carpool-nextjs
npm ci

cp .env.example.local .env.local   # then fill in your Supabase values
npm run dev                        # http://localhost:3000
```

Without a configured Supabase project the app starts but cannot authenticate anyone. Work through
the setup below first.

## Supabase setup

### 1. Create a project

Create a new project at [supabase.com](https://supabase.com) — the free tier is enough for a group
of this size. Pick a region close to you; it **cannot be changed later**. From
**Project Settings → API** you need three values:

| Value | Used as | Visibility |
|---|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` | public |
| `anon` public key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public, ends up in the browser bundle — that is intended |
| `service_role` key | `SUPABASE_SERVICE_ROLE_KEY` | **secret**, bypasses Row Level Security completely |

> **Never** give the service-role key a `NEXT_PUBLIC_` prefix. That prefix inlines the value into
> every client bundle that references it, handing full database access to anyone who opens the
> page.

### 2. Apply the database schema

Two migrations, **both required, in this order**:

| File | Contents |
|---|---|
| [`supabase/migrations/0001_schema.sql`](supabase/migrations/0001_schema.sql) | tables, sequences, constraints and the stored procedures |
| [`supabase/migrations/0002_security.sql`](supabase/migrations/0002_security.sql) | grants, RLS policies, role handling |

After `0001` alone, no role except `service_role` has access — the app will not work until `0002`
has been applied.

**Option A — SQL editor:** open the Supabase dashboard → *SQL Editor*, paste the contents of each
file and run them one after the other.

**Option B — Supabase CLI** (the repo ships a [`supabase/config.toml`](supabase/config.toml)):

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

Both migrations are idempotent and can be re-run on an existing database.

> **On a database that predates the migration directory,** `supabase db push` is not enough: it
> replays `0001_schema.sql`, whose `ADD CONSTRAINT` statements fail against constraints that
> already exist. Mark the baseline as applied first
> (`supabase migration repair --status applied 0001`), or run `0002_security.sql` directly against
> the database.

The stand-alone `.sql` files under `supabase/` are the individual stored procedures kept for
reference. They are already contained in `0001_schema.sql` and do not need to be run separately.

### 3. Configure environment variables

```bash
cp .env.example.local .env.local
```

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

`.env.local` is git-ignored.

### 4. Create the first admin

Start the app and open **`/setup`**. The form creates the first user with
`app_metadata.role = "admin"`.

The route locks itself as soon as **any** user exists — `/api/setup-admin` refuses to run a second
time. If you ever need to redo it, delete all users under *Authentication → Users* in the Supabase
dashboard first.

### 5. Add drivers and invite the group

As admin:

1. **`/fahrer_admin`** — create one entry per person: name, short label, and the stop they board at
   (`1` = start point, `2` = intermediate stop). Only people listed here can be proposed as
   drivers.
2. **`/invite_admin`** — generate invite codes. A code can be restricted to one e-mail address,
   given an expiry date, and carries the role the new account will receive. Each code works exactly
   once.
3. Send the invite link. Recipients register at **`/register`** with the code. Its endpoint
   `/api/invite/register` is one of only two API routes the middleware lets through without a
   session, which is why the code is validated in full inside the handler.
4. **`/user_admin`** — change roles or remove accounts later on.

> **Note when upgrading an existing installation:** roles moved from `user_metadata` to
> `app_metadata`. `app_metadata` only enters the JWT on the next token refresh, so existing
> sessions must sign out and back in before admin rights take effect. The migration moves the
> existing roles over by itself; no manual reassignment is needed.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Public anon key, subject to RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Secret key for server-side admin operations (user creation, invites, role changes) |
| `SUPABASE_DB_URL` | no | Direct Postgres connection, used only by `scripts/dump_db.sh` / `.cmd` |
| `NEXT_PUBLIC_APP_VERSION` | auto | Written by `scripts/postbuild.js` at build time |
| `NEXT_PUBLIC_GIT_TAG` | auto | Latest git tag, same script |
| `NEXT_PUBLIC_COMMIT_HASH` | auto | Short commit hash, same script |

The last three are displayed in the header and are set automatically — do not maintain them by
hand.

## Deployment

Any host that runs Next.js works. On **Vercel**:

1. Import the GitHub repository.
2. Add the environment variables under *Settings → Environment Variables*. Only
   `SUPABASE_SERVICE_ROLE_KEY` must be marked as sensitive; the two `NEXT_PUBLIC_` values are
   public by design.
3. Deploy. Build command `npm run build`, no further configuration needed.

Environment changes do not reach deployments that already exist — redeploy after changing a
variable.

> **Build gotcha:** despite its name, `scripts/postbuild.js` runs **before** `next build`
> (`"build": "node scripts/postbuild.js && next build"`). It writes the three version variables
> into `.env.local` so that `next build` can pick them up. On a host without git history the tag
> and hash simply stay empty; the build still succeeds.

## Install as an app

The app ships as a Progressive Web App — no store, no native build, no extra dependency.

**iOS/iPadOS:** open the site in Safari → *Share* → *Add to Home Screen*.
**Android:** open in Chrome → *⋮* → *Install app* (or accept the install prompt).

You then get a home screen icon and a standalone window without browser chrome. The service worker
([`public/sw.js`](public/sw.js)) caches the build assets, so repeat launches are fast, and shows
[`public/offline.html`](public/offline.html) instead of the browser error page when there is no
connection.

**Deliberately not offline-capable beyond that.** Trips live in Supabase and are always fetched
live; `/api/*` responses are never cached because they depend on the session. Offline you get a
clean notice, not stale data.

Notes:

- A service worker only runs over **HTTPS** (or on `localhost`). It is registered in production
  builds only — in `next dev` the asset cache would fight hot reload.
- After a deployment, a running app picks up the new version on its next launch.
- Changing the caching rules? Bump `CACHE_VERSION` in `public/sw.js`; old caches are dropped on
  activation.

## Development

```bash
npm run dev          # dev server on :3000
npm test             # behaviour tests: algorithm, invariants, real history (Node 22+)
npm run test:schema  # schema, configuration and browser-compatibility checks
npm run test:watch   # watch mode
npm run typecheck    # tsc --noEmit
npm run lint         # Biome: formatting and lint rules, read-only
npm run lint:fix     # the same, applying the safe fixes
npm run format       # formatter only
npm run build        # production build
```

### Lint and formatting

[Biome](https://biomejs.dev) covers both, from a single
[`biome.json`](biome.json). CI runs `biome ci`, which checks formatting and rules
in one pass without changing anything: findings marked as errors fail the build,
warnings stay visible in the log.

Three rules are turned down from the defaults, deliberately:

| Rule | Setting | Reason |
|---|---|---|
| `noNonNullAssertion` | off | almost every hit is `process.env.NEXT_PUBLIC_SUPABASE_URL!`, which is how the Supabase client is documented |
| `noExplicitAny` | warn | 28 occurrences; typing them is the same work as turning on `strict` in the tsconfig and belongs in its own change |
| `useExhaustiveDependencies` | warn | adding a dependency changes when an effect runs — on the start page that is the load order of tours and quotas; each case wants reading, not a bulk fix |

The formatter follows what the code already did (four spaces, double quotes,
semicolons). The one commit that reformatted the tree is listed in
[`.git-blame-ignore-revs`](.git-blame-ignore-revs); `git config
blame.ignoreRevsFile .git-blame-ignore-revs` keeps it out of `git blame`.

### Tests

| Suite | Purpose |
|---|---|
| `tests/unit.test.ts` | algorithm behaviour |
| `tests/property.test.ts` | invariants across generated inputs |
| `tests/golden.test.ts` | replay against the real trip history in `tests/fixtures/` |
| `tests/schema.test.ts` | schema, configuration and browser-compatibility guardrails |

`npm test` covers the first three, `npm run test:schema` the fourth. All of them are green and gate
CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)), which additionally runs `tsc` on every
push and pull request.

The schema suite is worth keeping an eye on: it asserts properties that are easy to break by
accident — no credentials in the repository, the service-role key without a `NEXT_PUBLIC_` prefix,
roles read from `app_metadata` rather than `user_metadata`, and no JS methods in `src/` that older
mobile browsers do not have.

### Scripts

```bash
node scripts/simulate_algorithms.mjs   # compares assignment strategies (basis/stress/real)
node scripts/replay_check.mjs          # one-step prediction against the real history
node scripts/override_test.mjs         # how fast manual overrides even out again

scripts/dump_db.sh                     # full logical backup (roles, schema, data)
scripts/dump_db.sh --local             # against a local `supabase start` instance
```

`dump_db` needs the Supabase CLI and `SUPABASE_DB_URL`; it writes three files, because roles,
schema and data can only be restored in that order.

## Project layout

```
src/
  pages/                 routes (Pages Router)
    index.tsx            main view: trip list + new trip
    setup.tsx            one-time first-admin wizard
    register.tsx         redeem an invite code
    fahrer_admin.tsx     driver management
    user_admin.tsx       user and role management
    invite_admin.tsx     invite codes
    api/                 API routes (fahrer, tours, users, invite, setup-admin)
    _app.tsx             global styles, service worker registration
    _document.tsx        html shell, icons, manifest link
  components/            UI components (new_day, tour_table, header, modals)
  lib/
    supabase/            SSR-capable clients (browser, server, API routes)
    supabaseClientAdmin  service-role client — server-side only
    middleware/          session refresh, admin guard
    fairness/model.ts    generalised leg-based fairness model (not yet used by the app)
    roles.ts             allowed roles
  interfaces/            shared types
public/
  manifest.json          PWA metadata
  sw.js                  service worker (asset cache, offline fallback)
  offline.html           page shown when there is no connection
supabase/
  migrations/            0001_schema.sql, 0002_security.sql
  *.sql                  individual stored procedures (reference copies)
scripts/                 build, backup and analysis scripts
tests/                   test suites and CSV fixtures
```

`src/middleware.ts` matches `/api/:path*` and refreshes the Supabase session on every API call.
Unauthenticated calls are rejected with `401` except for the two routes on the allowlist in
`src/lib/middleware/checkAuth.ts` (`/api/invite/register` and `/api/setup-admin`), both of which
validate authorisation themselves. Server-side API routes use `createApiClient(req)` with the
caller's session rather than the module client.

## Data model

Three tables (German column names, kept from the original implementation):

**`fahrer`** — people who may drive

| Column | Type | Meaning |
|---|---|---|
| `id` | bigint | identity |
| `name` | text | display name |
| `label` | text | short label, unique |
| `startpunkt` | smallint | `1` = start point, `2` = intermediate stop |

**`fahrten`** — trips

| Column | Type | Meaning |
|---|---|---|
| `id` | bigint | identity |
| `datum` | date | trip date |
| `anwesend_ids` | jsonb | array of `fahrer.id` present that day |
| `fahrerA_id` | bigint | driver of leg 1 |
| `fahrerB_id` | bigint | driver of leg 2 |

**`invites`** — invite codes (`code`, `used`, `used_by`, `email`, `role`, `expires_at`)

## Known limitations

Honest list of what this version does *not* do.

1. **Exactly two legs are hard-wired.** `fahrerA_id` / `fahrerB_id` are columns, and
   `startpunkt ∈ {1, 2}` is assumed in the stored procedures, API and UI. A third boarding point
   cannot be added incrementally.
2. **Counter buckets grow as 2ⁿ.** One bucket per attendance set means most buckets hold one or two
   trips, and knowledge does not transfer between them. The partial-match fallback in `new_day.tsx`
   picks arbitrarily via `.pop()` when several subsets match. Harmless at three drivers from A,
   relevant from four upwards.
3. **Manual overrides even out slowly.** After 20 forced trips the bucket method needs ~111 trips
   to rebalance, where a balance-based method needs ~24 — the deficit sits in a single bucket and
   only unwinds when that exact constellation recurs.
4. **Vehicle capacity is not modelled.** Seat counts appear nowhere; the schema cannot express two
   drivers on one leg.
5. **The quota computation runs in the server process, not in the database.** The stored
   procedures return only the distinct attendance sets; the API route then reads the `fahrten`
   table into Node once per set — `quotes_zw` once per driver *and* set. That is a lot of round
   trips between the server and Postgres for something the database could aggregate in one query.
   It says nothing about what the browser receives: `/api/fahrer/quotes_sp` and `quotes_zw` answer
   with the finished quota map alone. The trip list the browser does get comes from
   `/api/tours/list` and is what the table displays.
6. **Single group per instance.** No `group_id`, no multi-tenancy.
7. **German UI only**, no i18n layer.
8. **The generalised model is not wired in.** `src/lib/fairness/model.ts` supports k legs and a
   switchable fairness basis (`Options.basis`), and is covered by tests, but the app still uses the
   old quote paths.
9. **Data quality caveat:** 45 of 188 historical records are missing (deleted simulation runs), and
   it was never recorded whether the stored driver was the proposed one. Agreement with history is
   therefore not a usable quality metric — evaluation goes through target/actual
   (`evaluateFairness`) instead.

**Fairness at the intermediate stop is an open group decision, not a bug.** The B driver covers leg
2 on 49 % of the days they attend, which is exactly the target under the rule encoded in the app
("arriving driver versus waiting driver, 50/50"). Under the alternative rule ("all passengers share
the leg proportionally") the target would be lower. Both are defensible; the switch is
`Options.basis` in `src/lib/fairness/model.ts`.

## Security

- Roles live in `app_metadata` only (writable exclusively with the service-role key) — previously
  `user_metadata`, which the client can write itself via `auth.updateUser()`
- `anon` has no privileges in schema `public`; RLS policies restrict `fahrer` and `fahrten` to
  authenticated users and `invites` to admins
- The service-role key has no `NEXT_PUBLIC_` prefix, is read server-side only and runs with
  `persistSession: false`
- Invite codes are claimed atomically and validated for `used`, `expires_at` and the bound e-mail
  address; unknown, used and expired codes return one identical error so codes cannot be probed

When self-hosting, make sure `0002_security.sql` really was applied — verify in the Supabase
dashboard under *Authentication → Policies* that `fahrten` is **not** covered by a `USING (true)`
policy.

Found something? Please open an issue at
[Mike-F362/carpool-nextjs](https://github.com/Mike-F362/carpool-nextjs/issues) — for security
issues without a public proof of concept.

## Contributing

Pull requests are welcome. Please keep `npm test`, `npm run test:schema` and `npm run typecheck`
green; CI runs all three.

## License

[Apache License 2.0](LICENSE) — free to use, modify and self-host, including commercially, with a
patent grant and an attribution requirement.
