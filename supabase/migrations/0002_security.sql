-- Sicherheits-Hotfix.
--
-- Behebt drei Befunde aus HANDOFF.md:
--   1. Rollenpruefung lag in user_metadata (per auth.updateUser() vom Client
--      selbst beschreibbar) -> jeder Nutzer konnte sich zum Admin machen.
--   2. "fahrten" war ueber USING (true) plus GRANT ALL TO anon fuer jeden mit
--      dem oeffentlichen anon-Key les-, schreib- und loeschbar. Fuer "fahrer"
--      und "invites" galt dasselbe fuer Lesezugriffe - inklusive der
--      Einladungscodes.
--   3. Die Einladungstabelle war ohne Anmeldung lesbar.
--
-- Idempotent: laesst sich auf die laufende Datenbank anwenden und ebenso auf
-- eine frisch aus 0001_schema.sql aufgebaute.
--
-- ACHTUNG nach dem Einspielen: app_metadata landet erst beim naechsten
-- Token-Refresh im JWT. Bestehende Sitzungen muessen sich neu anmelden, sonst
-- greift die Admin-Policy fuer sie noch nicht.

-- ---------------------------------------------------------------------------
-- Alte, offene Policies entfernen
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Admins dürfen alles" ON "public"."invites";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."invites";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."fahrer";
DROP POLICY IF EXISTS "Enable insert access for all users" ON "public"."fahrer";
DROP POLICY IF EXISTS "Enable read/write access for all users" ON "public"."fahrten";

-- Namen des Hotfix selbst, damit ein erneuter Lauf nicht scheitert
DROP POLICY IF EXISTS "fahrer: angemeldete Nutzer" ON "public"."fahrer";
DROP POLICY IF EXISTS "fahrten: angemeldete Nutzer" ON "public"."fahrten";
DROP POLICY IF EXISTS "invites: nur Admins" ON "public"."invites";

-- ---------------------------------------------------------------------------
-- Rechte: anon bekommt nichts, service_role und authenticated gezielt
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

-- invites: kein Tabellenrecht fuer authenticated. Alle Zugriffe der App laufen
-- ueber supabaseAdmin (service_role) in den API-Routen.
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

-- Fahrer und Fahrten: jede angemeldete Person darf alles. Das entspricht der
-- heutigen Oberflaeche (Fahrerverwaltung und Tourenliste schreiben direkt aus
-- dem Browser). Eine Trennung nach Rollen waere der naechste Schritt, aber
-- kein Teil dieses Hotfix - hier geht es darum, anon auszusperren.
CREATE POLICY "fahrer: angemeldete Nutzer" ON "public"."fahrer"
    TO "authenticated"
    USING ((SELECT "auth"."role"()) = 'authenticated')
    WITH CHECK ((SELECT "auth"."role"()) = 'authenticated');

CREATE POLICY "fahrten: angemeldete Nutzer" ON "public"."fahrten"
    TO "authenticated"
    USING ((SELECT "auth"."role"()) = 'authenticated')
    WITH CHECK ((SELECT "auth"."role"()) = 'authenticated');

-- Einladungen: Rolle aus app_metadata. Nur der Service-Role-Key kann dieses
-- Feld setzen, ein Client kann es nicht ueberschreiben.
CREATE POLICY "invites: nur Admins" ON "public"."invites"
    TO "authenticated"
    USING (((SELECT "auth"."jwt"()) -> 'app_metadata' ->> 'role') = 'admin')
    WITH CHECK (((SELECT "auth"."jwt"()) -> 'app_metadata' ->> 'role') = 'admin');

-- ---------------------------------------------------------------------------
-- Backfill: bestehende Rollen von user_metadata nach app_metadata
-- ---------------------------------------------------------------------------

UPDATE "auth"."users"
SET "raw_app_meta_data" = COALESCE("raw_app_meta_data", '{}'::"jsonb")
    || "jsonb_build_object"('role', COALESCE("raw_user_meta_data" ->> 'role', 'user'))
WHERE COALESCE("raw_app_meta_data" ->> 'role', '') = '';

-- Die Kopie in user_metadata entfernen, damit sie nicht faelschlich
-- weiterverwendet wird. Sie war ohnehin vom Client aus beschreibbar.
UPDATE "auth"."users"
SET "raw_user_meta_data" = "raw_user_meta_data" - 'role'
WHERE "raw_user_meta_data" ? 'role';
