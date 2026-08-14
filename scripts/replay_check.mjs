#!/usr/bin/env node
/**
 * Ein-Schritt-Prognose gegen die echte Historie.
 *
 * Fuer jede Fahrt t wird der Zustand ausschliesslich aus den ECHTEN Fahrten
 * 1..t-1 aufgebaut und gefragt: haette das Verfahren denselben Fahrer
 * vorgeschlagen wie der, der tatsaechlich eingetragen ist?
 *
 * Damit divergieren die Zustaende nicht - anders als beim freien Replay in
 * simulate_algorithms.mjs, wo jedes Verfahren seine eigene Historie erzeugt.
 *
 * Etappe 2 wird gegen den ECHTEN Fahrer A getestet, weil die Kandidatenmenge
 * dort von ihm abhaengt.
 *
 *   node scripts/replay_check.mjs [--data <ordner>]
 */

import fs from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const DIR = argv.includes("--data")
    ? argv[argv.indexOf("--data") + 1]
    : "/sessions/determined-zealous-cannon/mnt/fg/db_export_2026-08-13";

const csv = (f) => fs.readFileSync(path.join(DIR, f), "utf8").trim().split("\n").slice(1);

const MEMBERS = csv("fahrer.csv").map((l) => {
    const c = l.split(",");
    return { id: +c[0], label: c[4].trim(), stop: +c[3] };
});
const byId = new Map(MEMBERS.map((m) => [m.id, m]));
const lbl = (id) => byId.get(id)?.label ?? "-";

const TOURS = csv("fahrten.csv")
    .map((l) => {
        const m = l.match(/^([^,]*),([^,]*),([^,]*),"?(\[[^\]]*\])"?,([^,]*),([^,]*)$/);
        return { date: m[2], present: JSON.parse(m[4]).sort((a, b) => a - b), drivers: [+m[5], +m[6]] };
    })
    .sort((a, b) => (a.date < b.date ? -1 : 1));

const eligible = (present, leg, prev) => {
    const s = present.filter((id) => byId.get(id).stop === leg);
    if (prev != null && !s.includes(prev)) s.push(prev);
    return s.sort((a, b) => a - b);
};
const riders = (present, leg) => present.filter((id) => byId.get(id).stop <= leg).sort((a, b) => a - b);

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

// --------------------------------------------------------------- Verfahren

function bucket(hist, present, realA) {
    const last = lastDrive(hist);

    const presentA = present.filter((id) => byId.get(id).stop === 1);
    const bA = new Map();
    for (const t of hist) {
        const k = t.present.filter((id) => byId.get(id).stop === 1).join("-");
        if (!bA.has(k)) bA.set(k, new Map());
        bA.get(k).set(t.drivers[0], (bA.get(k).get(t.drivers[0]) ?? 0) + 1);
    }
    let qA = bA.get(presentA.join("-")) ?? new Map();
    let fb = false;
    if (qA.size === 0) {
        const hits = [...bA.keys()].filter((k) => {
            const ids = k.split("-");
            return presentA.every((id) => ids.includes(String(id)));
        });
        if (hits.length) {
            fb = true;
            qA = bA.get(hits.at(-1)) ?? new Map();
        }
    }
    const a = pick(presentA, (x) => qA.get(x) ?? 0, last);

    const presentB = present.filter((id) => byId.get(id).stop === 2);
    const bB = new Map();
    for (const t of hist) {
        const k = t.drivers[0] + "|" + t.present.filter((id) => byId.get(id).stop === 2).join("-");
        if (!bB.has(k)) bB.set(k, new Map());
        bB.get(k).set(t.drivers[1], (bB.get(k).get(t.drivers[1]) ?? 0) + 1);
    }
    const qB = bB.get(realA + "|" + presentB.join("-")) ?? new Map();
    const b = pick([...presentB, realA], (x) => qB.get(x) ?? 0, last);
    return { a, b, fb };
}

function balance(hist, present, realA, basis) {
    const led = new Map();
    for (const t of hist) {
        for (let leg = 1; leg <= 2; leg++) {
            const duty =
                basis === "mitfahrer"
                    ? riders(t.present, leg)
                    : eligible(t.present, leg, leg === 1 ? null : t.drivers[0]);
            for (const id of duty) led.set(`${id}|${leg}`, (led.get(`${id}|${leg}`) ?? 0) - 1 / duty.length);
            led.set(`${t.drivers[leg - 1]}|${leg}`, (led.get(`${t.drivers[leg - 1]}|${leg}`) ?? 0) + 1);
        }
    }
    const last = lastDrive(hist);
    const a = pick(eligible(present, 1, null), (x) => led.get(`${x}|1`) ?? 0, last);
    const b = pick(eligible(present, 2, realA), (x) => led.get(`${x}|2`) ?? 0, last);
    return { a, b, fb: false };
}

// ---------------------------------------------------------------- Auswertung

const VERFAHREN = {
    "Buckets (Ist-Algorithmus)": (h, p, a) => bucket(h, p, a),
    "Saldo / Pflicht Fahrberechtigte": (h, p, a) => balance(h, p, a, "fahrer"),
    "Saldo / Pflicht Mitfahrer": (h, p, a) => balance(h, p, a, "mitfahrer"),
};

const res = {};
for (const name of Object.keys(VERFAHREN)) res[name] = { a: 0, b: 0, n: 0, nb: 0, fb: 0, missA: [], missB: [] };

for (let i = 0; i < TOURS.length; i++) {
    const hist = TOURS.slice(0, i),
        cur = TOURS[i];
    const nA = cur.present.filter((id) => byId.get(id).stop === 1).length;
    const nB = eligible(cur.present, 2, cur.drivers[0]).length;

    for (const [name, fn] of Object.entries(VERFAHREN)) {
        const { a, b, fb } = fn(hist, cur.present, cur.drivers[0]);
        const r = res[name];
        if (nA > 1) {
            // nur echte Entscheidungen zaehlen
            r.n++;
            if (a === cur.drivers[0]) r.a++;
            else r.missA.push({ ...cur, pred: a });
        }
        if (nB > 1) {
            r.nb++;
            if (b === cur.drivers[1]) r.b++;
            else r.missB.push({ ...cur, pred: b });
        }
        if (fb) r.fb++;
    }
}

const zwang = {
    a: TOURS.filter((t) => t.present.filter((id) => byId.get(id).stop === 1).length <= 1).length,
    b: TOURS.filter((t) => eligible(t.present, 2, t.drivers[0]).length <= 1).length,
};

const SPLIT = "2025-07-16";
for (const [von, bis] of [
    ["0000-00-00", SPLIT],
    [SPLIT, "9999"],
]) {
    const sub = {};
    for (const name of Object.keys(VERFAHREN)) sub[name] = { a: 0, n: 0, b: 0, nb: 0 };
    for (let i = 0; i < TOURS.length; i++) {
        const cur = TOURS[i];
        if (!(cur.date >= von && cur.date < bis)) continue;
        const hist = TOURS.slice(0, i);
        const nA = cur.present.filter((id) => byId.get(id).stop === 1).length;
        const nB = eligible(cur.present, 2, cur.drivers[0]).length;
        for (const [name, fn] of Object.entries(VERFAHREN)) {
            const { a, b } = fn(hist, cur.present, cur.drivers[0]);
            const r = sub[name];
            if (nA > 1) {
                r.n++;
                if (a === cur.drivers[0]) r.a++;
            }
            if (nB > 1) {
                r.nb++;
                if (b === cur.drivers[1]) r.b++;
            }
        }
    }
    console.log(`\n### Zeitraum ${von === "0000-00-00" ? "bis" : "ab"} ${bis === "9999" ? von : bis}`);
    for (const [name, r] of Object.entries(sub))
        console.log(
            "  " +
                name.padEnd(32) +
                " Et.1 " +
                String(r.a).padStart(3) +
                "/" +
                String(r.n).padStart(3) +
                " = " +
                (r.n ? ((100 * r.a) / r.n).toFixed(0) : "-").padStart(3) +
                " %   Et.2 " +
                String(r.b).padStart(3) +
                "/" +
                String(r.nb).padStart(3) +
                " = " +
                (r.nb ? ((100 * r.b) / r.nb).toFixed(0) : "-").padStart(3) +
                " %",
        );
}
console.log();
console.log(`Fahrten gesamt: ${TOURS.length}`);
console.log(`davon ohne Wahlmoeglichkeit: Etappe 1 ${zwang.a}x, Etappe 2 ${zwang.b}x (nur ein Kandidat)\n`);

const w = Math.max(...Object.keys(VERFAHREN).map((s) => s.length));
console.log("Verfahren".padEnd(w), " Etappe 1        Etappe 2");
console.log("-".repeat(w), "--------------  --------------");
for (const [name, r] of Object.entries(res)) {
    const pa = ((100 * r.a) / r.n).toFixed(1),
        pb = ((100 * r.b) / r.nb).toFixed(1);
    console.log(
        name.padEnd(w),
        `${String(r.a).padStart(3)}/${r.n} = ${pa.padStart(5)} %`,
        `${String(r.b).padStart(3)}/${r.nb} = ${pb.padStart(5)} %`,
    );
}

const bk = res["Buckets (Ist-Algorithmus)"];
console.log(`\nPartial-Match-Fallback: ${bk.fb}x`);

console.log("\n--- Abweichungen des Bucket-Verfahrens auf Etappe 1 ---");
if (!bk.missA.length) console.log("  keine");
for (const m of bk.missA) {
    console.log(
        `  ${m.date}  anwesend ${m.present.map(lbl).join(",")}  ->  historisch ${lbl(m.drivers[0])}, Algorithmus ${lbl(m.pred)}`,
    );
}

console.log("\n--- Abweichungen des Bucket-Verfahrens auf Etappe 2 (bei echtem Fahrer A) ---");
if (!bk.missB.length) console.log("  keine");
for (const m of bk.missB) {
    console.log(
        `  ${m.date}  anwesend ${m.present.map(lbl).join(",")}  A=${lbl(m.drivers[0])}  ->  historisch ${lbl(m.drivers[1])}, Algorithmus ${lbl(m.pred)}`,
    );
}
