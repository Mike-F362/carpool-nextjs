#!/usr/bin/env bash
#
# Full logical backup of the Supabase database.
#
# The dump is split into three files because that is the only order in which it
# can be restored: roles own the objects, the schema needs its owners to exist,
# and the data needs its tables. A single combined file cannot express that.
#
#   scripts/dump_db.sh                      # $SUPABASE_DB_URL, else .env.local
#   scripts/dump_db.sh --local              # local `supabase start` instance
#   scripts/dump_db.sh --out backups/before-rename
#   scripts/dump_db.sh --schema public      # public only, no accounts
#
# Restore into an empty database, in this order:
#
#   psql "$SUPABASE_DB_URL" -f roles.sql
#   psql "$SUPABASE_DB_URL" -f schema.sql
#   psql "$SUPABASE_DB_URL" -f data.sql
#
# Requires the Supabase CLI (https://supabase.com/docs/guides/cli). It runs
# pg_dump in a container matching the server version, which avoids the
# "server version mismatch" abort of a locally installed pg_dump.

set -euo pipefail

# `auth` carries the user accounts including app_metadata, which is where this
# app reads roles from (see src/lib/roles.ts). Dumping `public` alone yields
# tours whose invites reference accounts that no longer exist after a restore.
SCHEMAS="public,auth"
OUT=""
TARGET=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --local)   TARGET=(--local); shift ;;
    --db-url)  TARGET=(--db-url "$2"); shift 2 ;;
    --schema)  SCHEMAS="$2"; shift 2 ;;
    --out)     OUT="$2"; shift 2 ;;
    -h|--help) awk 'NR>1 && /^#/ {sub(/^# ?/, ""); print; next} NR>1 {exit}' "$0"; exit 0 ;;
    *)         echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/.env.local"

# Read a single key out of an env file. Deliberately not `source`: that would
# also put SUPABASE_SERVICE_ROLE_KEY into the environment of everything spawned
# below, and a stray backtick in the file would execute. Trailing CR is stripped
# because .env.local is often saved with Windows line endings.
env_value() {
  sed -nE "s/^[[:space:]]*$1[[:space:]]*=[[:space:]]*//p" "$ENV_FILE" \
    | tail -n 1 | tr -d '\r' | sed -E 's/^"(.*)"$/\1/; s/^'\''(.*)'\''$/\1/'
}

if [[ ${#TARGET[@]} -eq 0 ]]; then
  # Precedence: --db-url / --local, then the environment, then .env.local.
  if [[ -z "${SUPABASE_DB_URL:-}" && -f "$ENV_FILE" ]]; then
    SUPABASE_DB_URL="$(env_value SUPABASE_DB_URL)"
  fi
  if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
    echo "No database URL. Add a line to .env.local:" >&2
    echo "  SUPABASE_DB_URL=postgresql://postgres.<ref>:<password>@<host>:5432/postgres" >&2
    echo "Dashboard -> Connect -> Session pooler (URI, port 5432)." >&2
    echo "Or pass --db-url <url> / --local." >&2
    exit 2
  fi
  TARGET=(--db-url "$SUPABASE_DB_URL")
fi

command -v supabase >/dev/null || { echo "supabase CLI not found" >&2; exit 127; }

# Relative to the repo, not to the current directory, so that the two scripts
# put their dumps in the same place no matter where they are invoked from.
OUT="${OUT:-$(dirname "$ENV_FILE")/backups/$(date +%Y-%m-%d_%H%M)}"
mkdir -p "$OUT"

# Roles are cluster-wide and not covered by a schema dump.
echo "==> roles"
supabase db dump "${TARGET[@]}" --role-only -f "$OUT/roles.sql"

echo "==> schema ($SCHEMAS)"
supabase db dump "${TARGET[@]}" --schema "$SCHEMAS" -f "$OUT/schema.sql"

# --use-copy: COPY instead of one INSERT per row. Faster to restore and, unlike
# INSERT, it does not silently reorder identity columns.
echo "==> data ($SCHEMAS)"
supabase db dump "${TARGET[@]}" --schema "$SCHEMAS" --data-only --use-copy -f "$OUT/data.sql"

echo
echo "Dump written to $OUT"
ls -lh "$OUT"
echo
echo "This dump contains personal data and password hashes. Keep it out of git"
echo "and off shared storage; backups/ is gitignored."
