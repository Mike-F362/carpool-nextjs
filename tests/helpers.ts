import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Member, Tour } from "../src/lib/fairness/model.ts";

export const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

/** Reproduzierbarer PRNG (mulberry32). Kein Test darf von Math.random abhaengen. */
export function rng(seed: number): () => number {
    return () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Standardaufstellung: n Fahrer ab Startpunkt, m ab Zwischenstopp. */
export function makeMembers(nA: number, nB: number): Member[] {
    return [
        ...Array.from({ length: nA }, (_, i) => ({ id: i + 1, label: `A${i + 1}`, stop: 1, canDrive: true })),
        ...Array.from({ length: nB }, (_, i) => ({ id: nA + i + 1, label: `B${i + 1}`, stop: 2, canDrive: true })),
    ];
}

/** Zufaellige Anwesenheitsfolge, immer mindestens ein Fahrer ab Startpunkt. */
export function randomSchedule(members: Member[], days: number, absence: number, seed: number) {
    const r = rng(seed);
    const out: { date: string; present: number[] }[] = [];
    for (let i = 0; i < days; i++) {
        let present: number[];
        do {
            present = members.filter(() => r() > absence).map((m) => m.id);
        } while (!present.some((id) => members.find((m) => m.id === id)!.stop === 1));
        const d = new Date(Date.UTC(2026, 0, 5) + i * 86400000);
        out.push({ date: d.toISOString().slice(0, 10), present });
    }
    return out;
}

export function loadRealFixture(): { members: Member[]; tours: Tour[] } {
    const read = (f: string) => fs.readFileSync(path.join(FIXTURES, f), "utf8").trim().split("\n").slice(1);

    const members: Member[] = read("fahrer.csv").map((l) => {
        const c = l.split(",");
        return { id: +c[0], label: c[4].trim(), stop: +c[3], canDrive: true };
    });

    const tours: Tour[] = read("fahrten.csv")
        .map((l) => {
            const m = l.match(/^([^,]*),([^,]*),([^,]*),"?(\[[^\]]*\])"?,([^,]*),([^,]*)$/);
            if (!m) throw new Error(`Fixture nicht parsebar: ${l}`);
            return {
                date: m[2],
                present: (JSON.parse(m[4]) as number[]).sort((a, b) => a - b),
                drivers: [+m[5], +m[6]],
            };
        })
        .sort((a, b) => (a.date < b.date ? -1 : 1));

    return { members, tours };
}

/** Liest eine Datei aus dem supabase-Verzeichnis, falls vorhanden. */
export function readSupabase(rel: string): string | null {
    const p = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "supabase", rel);
    return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
}
