#!/usr/bin/env node
/**
 * Selbstkorrektur-Test: gleicht sich die Summe nach manuellen Eingriffen aus?
 *
 * Die Vorschlaege werden mit Wahrscheinlichkeit p durch einen zufaelligen
 * anderen zulaessigen Fahrer ersetzt - also genau das, was passiert, wenn
 * jemand den Vorschlag im Dropdown ueberstimmt. Gemessen wird, wie weit die
 * Verteilung am Ende noch vom Soll abweicht.
 *
 * Gutes Verfahren  = Spreizung bleibt auch bei viel Eingriff klein.
 * Schlechtes       = Eingriffe bleiben dauerhaft in der Bilanz stehen.
 *
 *   node scripts/override_test.mjs
 *   node scripts/override_test.mjs --seeds 500 --data <ordner>
 */

import fs from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const arg = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
const SEEDS = Number(arg("--seeds", 200));
const DIR = arg("--data", "/sessions/determined-zealous-cannon/mnt/fg/db_export_2026-08-13");
const PS = [0, 0.1, 0.25, 0.5];

const csv = (f) => fs.readFileSync(path.join(DIR, f), "utf8").trim().split("\n").slice(1);

const MEMBERS = csv("fahrer.csv").map((l) => {
    const c = l.split(",");
    return { id: +c[0], label: c[4].trim(), stop: +c[3] };
});
const byId = new Map(MEMBERS.map((m) => [m.id, m]));

/** Nur die Anwesenheitsfolge wird uebernommen, die Fahrer bestimmt das Verfahren. */
const SCHEDULE = csv("fahrten.csv")
    .map((l) => {
        const m = l.match(/^([^,]*),([^,]*),([^,]*),"?(\[[^\]]*\])"?,([^,]*),([^,]*)$/);
        return { date: m[2], present: JSON.parse(m[4]).sort((a, b) => a - b) };
    })
    .sort((a, b) => (a.date < b.date ? -1 : 1));

const N_LEGS = 2;

function rng(seed) {
    return () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const eligible = (present, leg, prev) => {
    const s = present.filter((id) => byId.get(id).stop === leg);
    if (prev != null && !s.includes(prev)) s.push(prev);
    return s.sort((a, b) => a - b);
};
const riders = (present, leg) => present.filter((id) => byId.get(id).stop <= leg).sort((a, b) => a - b);
const obliged = (present, leg, prev, basis) =>
    basis === "mitfahrer" ? riders(present, leg) : eligible(present, leg, prev);

function lastDrive(hist) {
    const m = new Map();
    for (const t of hist) for (const id of t.drivers) if (!m.has(id) || t.date > m.get(id)) m.set(id, t.date);
    return m;
}
const pick = (cands, score, last) =>
    [...cands].sort((a, b) => {
        const d = score(a) - score(b);
        if (Math.abs(d) > 1e-9) return d;
        const la = last.get(a) ?? "",
            lb = last.get(b) ?? "";
        return la < lb ? -1 : la > lb ? 1 : a - b;
    })[0];

// -------------------------------------------------------------- Verfahren

function bucketSuggest(hist, present, leg, prevDriver) {
    const last = lastDrive(hist);
    if (leg === 1) {
        const pA = present.filter((id) => byId.get(id).stop === 1);
        const b = new Map();
        for (const t of hist) {
            const k = t.present.filter((id) => byId.get(id).stop === 1).join("-");
            if (!b.has(k)) b.set(k, new Map());
            b.get(k).set(t.drivers[0], (b.get(k).get(t.drivers[0]) ?? 0) + 1);
        }
        let q = b.get(pA.join("-")) ?? new Map();
        if (q.size === 0) {
            const hits = [...b.keys()].filter((k) => {
                const ids = k.split("-");
                return pA.every((id) => ids.includes(String(id)));
            });
            if (hits.length) q = b.get(hits.at(-1)) ?? new Map();
        }
        return pick(pA, (x) => q.get(x) ?? 0, last);
    }
    const pB = present.filter((id) => byId.get(id).stop === 2);
    const b = new Map();
    for (const t of hist) {
        const k = t.drivers[0] + "|" + t.present.filter((id) => byId.get(id).stop === 2).join("-");
        if (!b.has(k)) b.set(k, new Map());
        b.get(k).set(t.drivers[1], (b.get(k).get(t.drivers[1]) ?? 0) + 1);
    }
    const q = b.get(prevDriver + "|" + pB.join("-")) ?? new Map();
    return pick([...pB, prevDriver], (x) => q.get(x) ?? 0, last);
}

function balanceSuggest(ledger, hist, present, leg, prevDriver) {
    return pick(eligible(present, leg, prevDriver), (x) => ledger.get(`${x}|${leg}`) ?? 0, lastDrive(hist));
}

/** Ein Durchlauf mit Eingriffswahrscheinlichkeit p. */
function runOnce(strategy, p, seed) {
    const rand = rng(seed);
    const hist = [],
        ledger = new Map();

    for (const day of SCHEDULE) {
        const drivers = [];
        for (let leg = 1; leg <= N_LEGS; leg++) {
            const prev = leg === 1 ? null : drivers[leg - 2];
            const cands = eligible(day.present, leg, prev);
            let d =
                strategy === "bucket"
                    ? bucketSuggest(hist, day.present, leg, prev)
                    : balanceSuggest(ledger, hist, day.present, leg, prev);

            if (cands.length > 1 && rand() < p) {
                // Vorschlag ueberstimmt
                const others = cands.filter((x) => x !== d);
                d = others[Math.floor(rand() * others.length)];
            }
            drivers.push(d);
        }
        hist.push({ date: day.date, present: day.present, drivers });

        if (strategy !== "bucket") {
            for (let leg = 1; leg <= N_LEGS; leg++) {
                const duty = obliged(day.present, leg, leg === 1 ? null : drivers[leg - 2], strategy);
                for (const id of duty) {
                    const k = `${id}|${leg}`;
                    ledger.set(k, (ledger.get(k) ?? 0) - 1 / duty.length);
                }
                const k = `${drivers[leg - 1]}|${leg}`;
                ledger.set(k, (ledger.get(k) ?? 0) + 1);
            }
        }
    }
    return hist;
}

/** Endabweichung Ist-Soll je Etappe, gemessen am Massstab des Verfahrens. */
function spread(hist, basis) {
    const st = new Map();
    const g = (k) => st.get(k) ?? st.set(k, { soll: 0, ist: 0 }).get(k);
    for (const t of hist) {
        for (let leg = 1; leg <= N_LEGS; leg++) {
            const duty = obliged(t.present, leg, leg === 1 ? null : t.drivers[0], basis);
            for (const id of duty) g(`${id}|${leg}`).soll += 1 / duty.length;
            g(`${t.drivers[leg - 1]}|${leg}`).ist += 1;
        }
    }
    return Array.from({ length: N_LEGS }, (_, i) => {
        const d = MEMBERS.map((m) => st.get(`${m.id}|${i + 1}`))
            .filter(Boolean)
            .map((s) => s.ist - s.soll);
        return Math.max(...d) - Math.min(...d);
    });
}

// ---------------------------------------------------------------- Ausgabe

const VERFAHREN = [
    ["bucket", "Buckets (Ist-Algorithmus)", "fahrer"],
    ["fahrer", "Saldo / Pflicht Fahrberechtigte", "fahrer"],
    ["mitfahrer", "Saldo / Pflicht Mitfahrer", "mitfahrer"],
];

console.log(`Anwesenheitsfolge: ${SCHEDULE.length} echte Fahrten, ${SEEDS} Durchlaeufe je Stufe`);
console.log("Gemessen: Spreizung max-min von (Ist - Soll) am Ende des Zeitraums.");
console.log("Kleiner ist besser. Bleibt der Wert bei steigendem p flach, faengt sich das Verfahren selbst.\n");

for (const [strat, name, basis] of [...VERFAHREN, ["zufall", "Zufall (Referenz: keinerlei Steuerung)", "fahrer"]]) {
    console.log(name);
    console.log("  Eingriffe   Etappe 1 (Mittel / schlechtester)   Etappe 2 (Mittel / schlechtester)");
    for (const p of strat === "zufall" ? [1] : PS) {
        const runs = Array.from({ length: p === 0 ? 1 : SEEDS }, (_, s) =>
            spread(runOnce(strat === "zufall" ? "fahrer" : strat, p, s + 1), basis),
        );
        const avg = (i) => runs.reduce((a, r) => a + r[i], 0) / runs.length;
        const max = (i) => Math.max(...runs.map((r) => r[i]));
        console.log(
            `  ${String(Math.round(p * 100)).padStart(3)} %      ` +
                `${avg(0).toFixed(2).padStart(8)} / ${max(0).toFixed(2).padStart(8)}          ` +
                `${avg(1).toFixed(2).padStart(8)} / ${max(1).toFixed(2).padStart(8)}`,
        );
    }
    console.log();
}

// ------------------------------------------------- Erholung nach Stoerung

/**
 * Die ersten K Fahrten werden erzwungen von einer Person gefahren (maximale
 * Schieflage). Danach laeuft das Verfahren frei. Gemessen wird, nach wie vielen
 * weiteren Fahrten die Bilanz wieder innerhalb einer Fahrt liegt.
 */
function recovery(strategy, basis, K, forced) {
    const hist = [],
        ledger = new Map();
    let erholt = null;

    SCHEDULE.forEach((day, i) => {
        const drivers = [];
        for (let leg = 1; leg <= N_LEGS; leg++) {
            const prev = leg === 1 ? null : drivers[leg - 2];
            const cands = eligible(day.present, leg, prev);
            let d =
                strategy === "bucket"
                    ? bucketSuggest(hist, day.present, leg, prev)
                    : balanceSuggest(ledger, hist, day.present, leg, prev);
            if (i < K && cands.includes(forced)) d = forced; // erzwungene Schieflage
            drivers.push(d);
        }
        hist.push({ date: day.date, present: day.present, drivers });

        if (strategy !== "bucket") {
            for (let leg = 1; leg <= N_LEGS; leg++) {
                const duty = obliged(day.present, leg, leg === 1 ? null : drivers[leg - 2], strategy);
                for (const id of duty) {
                    const k = `${id}|${leg}`;
                    ledger.set(k, (ledger.get(k) ?? 0) - 1 / duty.length);
                }
                const k = `${drivers[leg - 1]}|${leg}`;
                ledger.set(k, (ledger.get(k) ?? 0) + 1);
            }
        }
        if (i >= K && erholt === null && spread(hist, basis)[0] <= 1.0) erholt = i - K + 1;
    });
    return { erholt, ende: spread(hist, basis)[0] };
}

const K = 20;
const forced = MEMBERS.find((m) => m.stop === 1).id;
console.log("-".repeat(72));
console.log(`Erholung: die ersten ${K} Fahrten faehrt Etappe 1 erzwungen immer ${byId.get(forced).label}.`);
console.log("Danach laeuft das Verfahren frei. Wie viele Fahrten bis die Bilanz wieder <= 1 ist?\n");
for (const [strat, name, basis] of VERFAHREN) {
    const r = recovery(strat, basis, K, forced);
    console.log(
        `  ${name.padEnd(34)} ${
            r.erholt === null
                ? "nie erreicht  (Restabweichung " + r.ende.toFixed(2) + ")"
                : String(r.erholt).padStart(3) + " Fahrten   (Restabweichung am Ende " + r.ende.toFixed(2) + ")"
        }`,
    );
}
