#!/usr/bin/env node
/**
 * Vergleich von Fahrer-Auswahlverfahren fuer die Fahrgemeinschaft.
 *
 *   node scripts/simulate_algorithms.mjs                       # Kunstszenario
 *   node scripts/simulate_algorithms.mjs --scenario stress --no-detail
 *   node scripts/simulate_algorithms.mjs --scenario real --data <ordner-mit-csv>
 *   ... --md > SIMULATION.md
 *
 * VERFAHREN
 *   bucket   Ist-Stand der App: Zaehler je exakter Besetzungsmenge (calc_qoutes.ts)
 *   fahrer   Saldo, Pflicht teilen sich die Fahrberechtigten der Etappe
 *            -> am Zwischenstopp: ankommender A-Fahrer gegen B-Fahrer, also 50/50
 *   mitfahrer Saldo, Pflicht teilen sich ALLE Mitfahrer der Etappe
 *            -> am Zwischenstopp zahlt jeder Insasse 1/n, der B-Fahrer faehrt seltener
 *
 * Die beiden Saldo-Varianten unterscheiden sich nur darin, WER fuer eine Etappe
 * in der Pflicht steht. Wer fahren *kann* (Auto am Stopp), ist davon unberuehrt.
 */

import fs from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const AS_MD = argv.includes("--md");
const arg = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
const SCENARIO = arg("--scenario", "basis");
const W = [Number(arg("--w1", 1)), Number(arg("--w2", 1))]; // Etappengewichte
const iso = (d) => d.toISOString().slice(0, 10);

// ------------------------------------------------------------------ Szenarien

const START = new Date(Date.UTC(2026, 7, 17)); // Mo, 17.08.2026
const VACATION = { member: 3, from: "2026-09-07", to: "2026-09-20" }; // 14 Kalendertage

function rng(seed) {
    // mulberry32, damit Laeufe reproduzierbar sind
    return () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function loadReal(dir) {
    const csv = (f) => fs.readFileSync(path.join(dir, f), "utf8").trim().split("\n").slice(1);
    const members = csv("fahrer.csv")
        .map((l) => {
            const c = l.split(",");
            return { id: +c[0], label: c[4].trim(), stop: +c[3], canDrive: true };
        })
        .sort((a, b) => a.stop - b.stop || a.id - b.id);

    const tours = csv("fahrten.csv")
        .map((l) => {
            const m = l.match(/^([^,]*),([^,]*),([^,]*),"?(\[[^\]]*\])"?,([^,]*),([^,]*)$/);
            if (!m) throw new Error("CSV nicht parsebar: " + l);
            return {
                date: m[2],
                present: JSON.parse(m[4]).sort((a, b) => a - b),
                historic: [+m[5], +m[6]],
            };
        })
        .sort((a, b) => (a.date < b.date ? -1 : 1));

    return { members, schedule: tours.map((t, i) => ({ ...t, week: Math.floor(i / 5) })) };
}

function buildScenario() {
    if (SCENARIO === "real") {
        const dir = arg("--data", "/sessions/determined-zealous-cannon/mnt/fg/db_export_2026-08-13");
        return loadReal(dir);
    }

    const cfg = {
        basis: {
            weeks: Number(arg("--weeks")) || 8,
            members: [
                { id: 1, label: "A1", stop: 1, canDrive: true },
                { id: 2, label: "A2", stop: 1, canDrive: true },
                { id: 3, label: "A3", stop: 1, canDrive: true },
                { id: 4, label: "B1", stop: 2, canDrive: true },
            ],
            present: (ms, { day, week }) =>
                ms
                    .filter((m) => !(m.id === VACATION.member && day >= VACATION.from && day <= VACATION.to))
                    .filter((m) => !(m.stop === 2 && week % 2 !== 0))
                    .map((m) => m.id),
        },
        stress: {
            weeks: Number(arg("--weeks")) || 16,
            members: [1, 2, 3, 4]
                .map((i) => ({ id: i, label: "A" + i, stop: 1, canDrive: true }))
                .concat([5, 6].map((i) => ({ id: i, label: "B" + (i - 4), stop: 2, canDrive: true }))),
            _r: rng(42),
            present(ms) {
                let ids;
                do {
                    ids = ms.filter(() => this._r() > 0.25).map((m) => m.id); // ~25 % Ausfall
                } while (!ids.some((id) => ms.find((m) => m.id === id).stop === 1));
                return ids;
            },
        },
    }[SCENARIO];

    if (!cfg) throw new Error(`Unbekanntes Szenario: ${SCENARIO}`);

    const schedule = [];
    for (let w = 0; w < cfg.weeks; w++) {
        for (let d = 0; d < 5; d++) {
            const date = new Date(START);
            date.setUTCDate(date.getUTCDate() + w * 7 + d);
            const day = iso(date);
            schedule.push({ date: day, week: w, present: cfg.present(cfg.members, { day, week: w }) });
        }
    }
    return { members: cfg.members, schedule };
}

const { members: MEMBERS, schedule: SCHEDULE } = buildScenario();
const byId = new Map(MEMBERS.map((m) => [m.id, m]));
const lbl = (id) => byId.get(id)?.label ?? "-";
const N_LEGS = Math.max(...MEMBERS.map((m) => m.stop)); // Stopps 1..k -> Etappen 1..k

// -------------------------------------------------------- gemeinsame Bausteine

/**
 * Wer KANN Etappe `leg` fahren: wer an Stopp `leg` mit eigenem Auto zusteigt,
 * plus wer die Vorgaengeretappe gefahren ist (das Fahrzeug faehrt ja weiter).
 */
function eligible(present, leg, prevDriver) {
    const s = present.filter((id) => byId.get(id).canDrive && byId.get(id).stop === leg);
    if (prevDriver != null && !s.includes(prevDriver)) s.push(prevDriver);
    return s.sort((a, b) => a - b);
}

/** Wer FAEHRT auf Etappe `leg` mit: alle, die an Stopp <= leg zugestiegen sind. */
function riders(present, leg) {
    return present.filter((id) => byId.get(id).stop <= leg).sort((a, b) => a - b);
}

/** Wer steht fuer Etappe `leg` in der Pflicht - der eine strittige Punkt. */
function obliged(present, leg, prevDriver, basis) {
    return basis === "mitfahrer" ? riders(present, leg) : eligible(present, leg, prevDriver);
}

function lastDriveMap(history) {
    const m = new Map();
    for (const t of history)
        for (const id of t.drivers) {
            if (!m.has(id) || t.date > m.get(id)) m.set(id, t.date);
        }
    return m;
}

// ------------------------------------------------- Verfahren 1: Buckets (Ist)

/** Repliziert calc_qoutes.ts + berechneFahrerVorschlagSp/Zw. */
function suggestBuckets(history, present, warn) {
    const last = lastDriveMap(history);
    const pick = (cands, q) =>
        [...cands].sort((a, b) => {
            const d = (q.get(a) ?? 0) - (q.get(b) ?? 0);
            if (d !== 0) return d;
            const la = last.get(a) ?? "",
                lb = last.get(b) ?? "";
            return la < lb ? -1 : la > lb ? 1 : a - b;
        })[0];

    const presentA = present.filter((id) => byId.get(id).stop === 1);
    const bucketsA = new Map();
    for (const t of history) {
        const k = t.present.filter((id) => byId.get(id).stop === 1).join("-");
        if (!bucketsA.has(k)) bucketsA.set(k, new Map());
        const c = bucketsA.get(k);
        c.set(t.drivers[0], (c.get(t.drivers[0]) ?? 0) + 1);
    }

    let quotesA = bucketsA.get(presentA.join("-")) ?? new Map();
    if (quotesA.size === 0) {
        // Partial-Match-Fallback aus new_day.tsx
        const hits = [...bucketsA.keys()].filter((k) => {
            const ids = k.split("-");
            return presentA.every((id) => ids.includes(String(id)));
        });
        if (hits.length) {
            warn.fallback++;
            if (hits.length > 1) warn.ambiguous++; // .pop() waehlt hier willkuerlich
            quotesA = bucketsA.get(hits.at(-1)) ?? new Map();
        }
    }
    const driverA = pick(presentA, quotesA);

    const presentB = present.filter((id) => byId.get(id).stop === 2);
    const bucketsB = new Map();
    for (const t of history) {
        const k = t.drivers[0] + "|" + t.present.filter((id) => byId.get(id).stop === 2).join("-");
        if (!bucketsB.has(k)) bucketsB.set(k, new Map());
        const c = bucketsB.get(k);
        c.set(t.drivers[1], (c.get(t.drivers[1]) ?? 0) + 1);
    }
    const quotesB = bucketsB.get(driverA + "|" + presentB.join("-")) ?? new Map();

    return [driverA, pick([...presentB, driverA], quotesB)];
}

// ------------------------------------------------- Verfahren 2+3: Saldoverfahren

function suggestBalance(ledger, present, last, basis) {
    const drivers = [];
    for (let leg = 1; leg <= N_LEGS; leg++) {
        const cands = eligible(present, leg, leg === 1 ? null : drivers[leg - 2]);
        drivers.push(
            [...cands].sort((a, b) => {
                const s = (ledger.get(`${a}|${leg}`) ?? 0) - (ledger.get(`${b}|${leg}`) ?? 0);
                if (Math.abs(s) > 1e-9) return s;
                const la = last.get(a) ?? "",
                    lb = last.get(b) ?? "";
                return la < lb ? -1 : la > lb ? 1 : a - b;
            })[0],
        );
    }
    return drivers;
}

/** Buchung der gefahrenen Tour (entspricht dem DB-Trigger auf trip_drivers). */
function post(ledger, present, drivers, basis) {
    for (let leg = 1; leg <= N_LEGS; leg++) {
        const duty = obliged(present, leg, leg === 1 ? null : drivers[leg - 2], basis);
        const share = W[leg - 1] / duty.length;
        for (const id of duty) {
            const k = `${id}|${leg}`;
            ledger.set(k, (ledger.get(k) ?? 0) - share);
        }
        const k = `${drivers[leg - 1]}|${leg}`;
        ledger.set(k, (ledger.get(k) ?? 0) + W[leg - 1]);
    }
}

// ------------------------------------------------------------------ Auswertung

/** Soll/Ist je Etappe, gemessen an einem waehlbaren Fairness-Massstab. */
function evaluate(history, basis) {
    const st = new Map();
    const g = (id, leg) => {
        const k = `${id}|${leg}`;
        if (!st.has(k)) st.set(k, { soll: 0, ist: 0, tage: 0 });
        return st.get(k);
    };
    for (const t of history) {
        for (let leg = 1; leg <= N_LEGS; leg++) {
            const duty = obliged(t.present, leg, leg === 1 ? null : t.drivers[leg - 2], basis);
            for (const id of duty) {
                const s = g(id, leg);
                s.soll += W[leg - 1] / duty.length;
                s.tage++;
            }
            g(t.drivers[leg - 1], leg).ist += W[leg - 1];
        }
    }
    return st;
}

function run(name, strategy) {
    const history = [],
        ledger = new Map(),
        warn = { fallback: 0, ambiguous: 0 };
    for (const day of SCHEDULE) {
        const drivers =
            strategy === "historisch"
                ? day.historic
                : strategy === "bucket"
                  ? suggestBuckets(history, day.present, warn)
                  : suggestBalance(ledger, day.present, lastDriveMap(history), strategy);
        history.push({ date: day.date, week: day.week, present: day.present, drivers });
        if (strategy === "fahrer" || strategy === "mitfahrer") post(ledger, day.present, drivers, strategy);
    }
    return { name, strategy, history, warn };
}

// --------------------------------------------------------------------- Ausgabe

const out = [];
const p = (s) => out.push(s);
const h = (l, s) => p(AS_MD ? `${"#".repeat(l)} ${s}\n` : `\n${s}\n${"=".repeat(s.length)}`);
const table = (rows) => {
    if (AS_MD) {
        p(`| ${rows[0].join(" | ")} |`);
        p(`|${rows[0].map(() => "---").join("|")}|`);
        rows.slice(1).forEach((r) => p(`| ${r.join(" | ")} |`));
    } else {
        const w = rows[0].map((_, i) => Math.max(...rows.map((r) => String(r[i]).length)));
        rows.forEach((r, i) => {
            p(r.map((c, j) => String(c).padEnd(w[j])).join("  "));
            if (i === 0) p(w.map((x) => "-".repeat(x)).join("  "));
        });
    }
    p("");
};

const strategies = [
    ...(SCENARIO === "real" ? [["historisch", "Historisch (was wirklich passiert ist)"]] : []),
    ["bucket", "Buckets (Ist-Algorithmus)"],
    ["fahrer", "Saldo / Pflicht bei den Fahrberechtigten"],
    ["mitfahrer", "Saldo / Pflicht bei allen Mitfahrern"],
];
const results = strategies.map(([s, n]) => run(n, s));

h(1, "Fahrerverteilung: Verfahrensvergleich");
if (AS_MD) p("```");
p(`Szenario       : ${SCENARIO}`);
p(`Zeitraum       : ${SCHEDULE[0].date} bis ${SCHEDULE.at(-1).date} (${SCHEDULE.length} Fahrten)`);
p(`Etappengewichte: w1=${W[0]}, w2=${W[1]}`);
p(`Teilnehmer     : ${MEMBERS.map((m) => `${m.label}(Stopp ${m.stop})`).join(", ")}`);
for (const m of MEMBERS) {
    const n = SCHEDULE.filter((d) => d.present.includes(m.id)).length;
    p(
        `  ${(m.label + " dabei").padEnd(16)}: ${String(n).padStart(3)} von ${SCHEDULE.length} (${Math.round((100 * n) / SCHEDULE.length)} %)`,
    );
}
p(`Besetzungen    : ${new Set(SCHEDULE.map((d) => d.present.join("-"))).size} verschiedene Kombinationen`);
if (AS_MD) p("```");
p("");

for (const basis of ["fahrer", "mitfahrer"]) {
    h(
        2,
        basis === "fahrer"
            ? "Massstab A: Pflicht teilen sich die Fahrberechtigten der Etappe"
            : "Massstab B: Pflicht teilen sich alle Mitfahrer der Etappe",
    );

    const rows = [["Verfahren", "Person", "Et.", "Soll", "Ist", "Delta"]];
    for (const r of results) {
        const st = evaluate(r.history, basis);
        for (let leg = 1; leg <= N_LEGS; leg++) {
            for (const m of MEMBERS) {
                const s = st.get(`${m.id}|${leg}`);
                if (!s?.tage) continue;
                rows.push([
                    r.name,
                    m.label,
                    leg,
                    s.soll.toFixed(1),
                    s.ist.toFixed(0),
                    (s.ist - s.soll >= 0 ? "+" : "") + (s.ist - s.soll).toFixed(1),
                ]);
            }
        }
    }
    table(rows);

    p("Spreizung (max-min Delta) je Etappe:");
    const sp = [["Verfahren", ...Array.from({ length: N_LEGS }, (_, i) => "Etappe " + (i + 1))]];
    for (const r of results) {
        const st = evaluate(r.history, basis);
        sp.push([
            r.name,
            ...Array.from({ length: N_LEGS }, (_, i) => {
                const d = MEMBERS.map((m) => st.get(`${m.id}|${i + 1}`))
                    .filter((s) => s?.tage)
                    .map((s) => s.ist - s.soll);
                return (Math.max(...d) - Math.min(...d)).toFixed(2);
            }),
        ]);
    }
    table(sp);
}

h(2, "Fahrten je Person");
const cnt = [["Verfahren", ...MEMBERS.map((m) => m.label)]];
for (let leg = 1; leg <= N_LEGS; leg++) {
    for (const r of results) {
        cnt.push([
            `${r.name} - Etappe ${leg}`,
            ...MEMBERS.map((m) => r.history.filter((t) => t.drivers[leg - 1] === m.id).length),
        ]);
    }
}
table(cnt);

const warns = results.find((r) => r.strategy === "bucket").warn;
if (warns.fallback) {
    p(`Partial-Match-Fallback im Bucket-Verfahren: ${warns.fallback}x benutzt, davon ${warns.ambiguous}x mehrdeutig.`);
    p("");
}

if (!argv.includes("--no-detail")) {
    h(2, "Fahrtenfolge");
    const rows = [["Datum", "Anwesend", ...results.flatMap((r) => [r.name + " A", r.name + " B"])]];
    SCHEDULE.forEach((d, i) =>
        rows.push([d.date, d.present.map(lbl).join(","), ...results.flatMap((r) => r.history[i].drivers.map(lbl))]),
    );
    table(rows);
}

console.log(out.join("\n"));
