/**
 * Statische Pruefung von Schema und Konfiguration.
 *
 * Braucht keine laufende Datenbank - liest die Migration als Text. Das faengt
 * genau die Klasse von Fehlern ab, die beim Weitergeben der App gefaehrlich
 * wird: offene Policies, Rollenpruefung an der falschen Stelle, Secrets mit
 * Client-Praefix.
 *
 * Fuer echte Verhaltenstests der Policies waere pgTAP gegen `supabase start`
 * der naechste Schritt; das hier ist die Absicherung, die ohne Docker laeuft.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string) => {
    const p = path.join(ROOT, rel);
    return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
};
const migrations = () => {
    const dir = path.join(ROOT, "supabase", "migrations");
    return fs.existsSync(dir)
        ? fs
              .readdirSync(dir)
              .filter((f) => f.endsWith(".sql"))
              .map((f) => fs.readFileSync(path.join(dir, f), "utf8"))
              .join("\n")
        : "";
};

describe("Migrationen sind vollstaendig", () => {
    const sql = migrations();

    test("Migrationsverzeichnis ist nicht leer", () => {
        assert.ok(sql.trim().length > 0, "keine Migrationen gefunden");
    });

    for (const t of ["fahrer", "fahrten", "invites"]) {
        test(`Tabelle ${t} ist definiert`, () => {
            assert.match(sql, new RegExp(`CREATE TABLE[^;]*"?${t}"?`, "i"));
        });
    }

    test("Fremdschluessel von fahrten auf fahrer sind vorhanden", () => {
        assert.match(sql, /FOREIGN KEY[^;]*REFERENCES[^;]*fahrer/i);
    });

    test("jede in der App aufgerufene Funktion existiert im Schema", () => {
        const calls = new Set<string>();
        const walk = (dir: string) => {
            for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
                const p = path.join(dir, e.name);
                if (e.isDirectory()) walk(p);
                else if (/\.tsx?$/.test(e.name)) {
                    for (const m of fs.readFileSync(p, "utf8").matchAll(/\.rpc\(\s*["'`]([^"'`]+)/g)) {
                        calls.add(m[1]);
                    }
                }
            }
        };
        walk(path.join(ROOT, "src"));
        assert.ok(calls.size > 0, "keine rpc-Aufrufe gefunden - Testlogik pruefen");
        for (const fn of calls) {
            assert.match(
                sql,
                new RegExp(`FUNCTION\\s+"?public"?\\."?${fn}"?`, "i"),
                `Funktion ${fn} wird aufgerufen, fehlt aber im Schema`,
            );
        }
    });
});

describe("Row Level Security", () => {
    const sql = migrations();

    for (const t of ["fahrer", "fahrten", "invites"]) {
        test(`RLS ist auf ${t} eingeschaltet`, () => {
            assert.match(sql, new RegExp(`ALTER TABLE[^;]*"?${t}"?[^;]*ENABLE ROW LEVEL SECURITY`, "i"));
        });
    }

    test("keine Policy erlaubt bedingungslos alles", () => {
        const offen = [
            ...sql.matchAll(/CREATE POLICY\s+"([^"]+)"\s+ON\s+"?public"?\."?(\w+)"?[^;]*?USING\s*\(\s*true\s*\)/gi),
        ].map((m) => `${m[2]}: "${m[1]}"`);
        assert.deepEqual(
            offen,
            [],
            "Policies mit USING (true) geben jedem mit dem oeffentlichen anon-Key " +
                "vollen Zugriff - auch ohne Anmeldung:\n  " +
                offen.join("\n  "),
        );
    });

    test("Rollenpruefung nutzt app_metadata, nicht user_metadata", () => {
        // user_metadata ist per auth.updateUser() vom Client selbst beschreibbar.
        // Wer die Rolle dort prueft, laesst jeden Nutzer sich zum Admin machen.
        const treffer = [...sql.matchAll(/CREATE POLICY\s+"([^"]+)"[^;]*user_metadata/gi)].map((m) => m[1]);
        assert.deepEqual(
            treffer,
            [],
            "Policies pruefen die Rolle in user_metadata (client-beschreibbar): " + treffer.join(", "),
        );
    });

    test("Schreibrechte auf fahrten liegen nicht bei anon", () => {
        assert.doesNotMatch(
            sql,
            /GRANT ALL ON TABLE\s+"?public"?\."?fahrten"?\s+TO\s+"?anon"?/i,
            "anon darf in fahrten schreiben und loeschen",
        );
    });
});

describe("Anwendungscode prueft die Rolle serverseitig", () => {
    test("withAdminAuth verlaesst sich nicht auf user_metadata", () => {
        const src = read("src/lib/middleware/withAdminAuth.ts");
        assert.ok(src, "withAdminAuth.ts nicht gefunden");
        assert.doesNotMatch(
            src!,
            /user_metadata\s*\?\.\s*role/,
            "Rolle wird aus dem client-beschreibbaren user_metadata gelesen",
        );
    });
});

describe("Secrets und Konfiguration", () => {
    test("der Service-Role-Key traegt kein NEXT_PUBLIC_-Praefix", () => {
        const src = read("src/lib/supabaseClientAdmin.ts");
        assert.ok(src, "supabaseClientAdmin.ts nicht gefunden");
        assert.doesNotMatch(
            src!,
            /NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/,
            "NEXT_PUBLIC_ wird von Next.js in jedes Bundle inlined, das die Variable " +
                "referenziert - der Key umgeht RLS vollstaendig",
        );
    });

    test("die Beispiel-Umgebung nennt alle benoetigten Variablen", () => {
        const env = read(".env.example.local") ?? read(".env.example") ?? "";
        for (const v of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) {
            assert.match(env, new RegExp(v), `${v} fehlt in der Beispiel-Umgebung - die App startet ohne sie nicht`);
        }
    });

    test("Abhaengigkeiten sind auf Versionen festgelegt", () => {
        const pkg = JSON.parse(read("package.json")!);
        const lose = Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })
            .filter(([, v]) => v === "latest" || v === "*")
            .map(([k]) => k);
        assert.deepEqual(lose, [], "nicht festgelegte Versionen machen Builds unreproduzierbar: " + lose.join(", "));
    });

    test("keine Zugangsdaten im Repository", () => {
        // Geprueft wird, was Git kennt - nicht, was auf der Platte liegt.
        // .env.local gehoert auf jede Entwicklermaschine; entscheidend ist,
        // dass die Datei nicht eingecheckt ist.
        const kandidaten = ["db_password", ".env.local", ".env", ".env.local.override"];
        let verfolgt: string;
        try {
            verfolgt = execFileSync("git", ["ls-files", "--", ...kandidaten], { cwd: ROOT, encoding: "utf8" }).trim();
        } catch {
            return; // kein Git verfuegbar (Tarball, Container) - nichts zu pruefen
        }
        assert.equal(verfolgt, "", "Zugangsdaten sind eingecheckt: " + verfolgt.split("\n").join(", "));
    });
});

describe("Browser-Kompatibilitaet", () => {
    test("kein Set.difference / Set.intersection im Anwendungscode", () => {
        // Erst ab Chrome 122 / Safari 17.4 / Firefox 127. Auf aelteren
        // Android-Geraeten wirft die App sonst einen TypeError.
        const treffer: string[] = [];
        const walk = (dir: string) => {
            for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
                const p = path.join(dir, e.name);
                if (e.isDirectory()) walk(p);
                else if (/\.tsx?$/.test(e.name)) {
                    const s = fs.readFileSync(p, "utf8");
                    if (
                        /\.(difference|intersection|symmetricDifference)\s*\(/.test(s) ||
                        /\.keys\(\)\s*\.\s*(filter|map)\s*\(/.test(s)
                    ) {
                        treffer.push(path.relative(ROOT, p));
                    }
                }
            }
        };
        walk(path.join(ROOT, "src"));
        assert.deepEqual(treffer, [], "sehr neue ES-Methoden ohne breite Browserunterstuetzung: " + treffer.join(", "));
    });
});
