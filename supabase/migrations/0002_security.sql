-- Security hotfix.
--
-- Fixes three findings from HANDOFF.md:
--   1. The role check read user_metadata, which clients can write through
--      auth.updateUser() -> any user could make themselves an admin.
--   2. "fahrten" was readable, writable and deletable by anyone holding the
--      public anon key, via USING (true) plus GRANT ALL TO anon. The same
--      applied to reads on "fahrer" and "invites" - invite codes included.
--   3. The invites table was readable without signing in.
--
-- Idempotent: applies to the running database as well as to one freshly built
-- from 0001_schema.sql.
--
-- Note after applying: app_metadata only reaches the JWT on the next token
-- refresh. Existing sessions have to sign in again, otherwise the admin policy
-- does not take effect for them yet.

-- ---------------------------------------------------------------------------
-- Drop the old, open policies
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Admins dürfen alles" ON "public"."invites";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."invites";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."fahrer";
DROP POLICY IF EXISTS "Enable insert access for all users" ON "public"."fahrer";
DROP POLICY IF EXISTS "Enable read/write access for all users" ON "public"."fahrten";

-- Earlier German names of this migration's own policies, in case it already
-- ran once before the rename
DROP POLICY IF EXISTS "fahrer: angemeldete Nutzer" ON "public"."fahrer";
DROP POLICY IF EXISTS "fahrten: angemeldete Nutzer" ON "public"."fahrten";
DROP POLICY IF EXISTS "invites: nur Admins" ON "public"."invites";

DROP POLICY IF EXISTS "fahrer: signed-in users" ON "public"."fahrer";
DROP POLICY IF EXISTS "fahrten: signed-in users" ON "public"."fahrten";
DROP POLICY IF EXISTS "invites: admins only" ON "public"."invites";

-- ---------------------------------------------------------------------------
-- Privileges: nothing for anon, targeted grants for the other roles
-- ---------------------------------------------------------------------------

REVOKE ALL ON ALL TABLES IN SCHEMA "public" FROM "anon";
REVOKE ALL ON ALL SEQUENCES IN SCHEMA "public" FROM "anon";
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA "public" FROM "anon";
REVOKE USAGE ON SCHEMA "public" FROM "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
    REVOKE ALL ON TABLES FROM "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
    REVOKE ALL ON SEQUENCES FROM "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
    REVOKE ALL ON FUNCTIONS FROM "anon";

GRANT USAGE ON SCHEMA "public" TO "authenticated", "service_role";

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."fahrer" TO "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."fahrten" TO "authenticated";
GRANT USAGE, SELECT ON SEQUENCE "public"."fahrer_id_seq" TO "authenticated";
GRANT USAGE, SELECT ON SEQUENCE "public"."fahrten_id_seq" TO "authenticated";

-- invites: no table privilege for authenticated. Every access the app makes
-- goes through supabaseAdmin (service_role) in the API routes.
GRANT ALL ON TABLE "public"."invites" TO "service_role";
GRANT ALL ON TABLE "public"."fahrer" TO "service_role";
GRANT ALL ON TABLE "public"."fahrten" TO "service_role";
GRANT ALL ON SEQUENCE "public"."fahrer_id_seq" TO "service_role";
GRANT ALL ON SEQUENCE "public"."fahrten_id_seq" TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."get_last_tour_per_driver"() TO "authenticated", "service_role";
GRANT EXECUTE ON FUNCTION "public"."get_letzte_fahrten_pro_fahrer"() TO "authenticated", "service_role";
GRANT EXECUTE ON FUNCTION "public"."get_unique_attendance_ids"() TO "authenticated", "service_role";
GRANT EXECUTE ON FUNCTION "public"."get_unique_zw_attendance_ids"() TO "authenticated", "service_role";
GRANT EXECUTE ON FUNCTION "public"."load_tours"() TO "authenticated", "service_role";

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------

ALTER TABLE "public"."fahrer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."fahrten" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."invites" ENABLE ROW LEVEL SECURITY;

-- Drivers and trips: every signed-in person may do everything. That matches
-- today's interface, where driver administration and the trip table write
-- straight from the browser. Splitting this by role would be the next step,
-- but is not part of this hotfix - the point here is to shut anon out.
CREATE POLICY "fahrer: signed-in users" ON "public"."fahrer"
    TO "authenticated"
    USING ((SELECT "auth"."role"()) = 'authenticated')
    WITH CHECK ((SELECT "auth"."role"()) = 'authenticated');

CREATE POLICY "fahrten: signed-in users" ON "public"."fahrten"
    TO "authenticated"
    USING ((SELECT "auth"."role"()) = 'authenticated')
    WITH CHECK ((SELECT "auth"."role"()) = 'authenticated');

-- Invites: role taken from app_metadata. Only the service role key can set
-- that field, a client cannot overwrite it.
CREATE POLICY "invites: admins only" ON "public"."invites"
    TO "authenticated"
    USING (((SELECT "auth"."jwt"()) -> 'app_metadata' ->> 'role') = 'admin')
    WITH CHECK (((SELECT "auth"."jwt"()) -> 'app_metadata' ->> 'role') = 'admin');

-- ---------------------------------------------------------------------------
-- Backfill: move existing roles from user_metadata to app_metadata
-- ---------------------------------------------------------------------------

UPDATE "auth"."users"
SET "raw_app_meta_data" = COALESCE("raw_app_meta_data", '{}'::"jsonb")
    || "jsonb_build_object"('role', COALESCE("raw_user_meta_data" ->> 'role', 'user'))
WHERE COALESCE("raw_app_meta_data" ->> 'role', '') = '';

-- Drop the copy in user_metadata so nobody keeps relying on it. It was
-- client-writable to begin with.
UPDATE "auth"."users"
SET "raw_user_meta_data" = "raw_user_meta_data" - 'role'
WHERE "raw_user_meta_data" ? 'role';
