/**
 * Eigenschaftstests: "die Summe muss stimmen".
 *
 * Statt einzelne Faelle zu pruefen, werden viele zufaellige Historien erzeugt
 * und die Invariante geprueft, auf die es der Fahrgemeinschaft ankommt.
 * Alle Zufallsquellen sind geseedet, Fehlschlaege sind reproduzierbar.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
    buildLedger,
    eligibleDrivers,
    evaluateFairness,
    lastDriveDates,
    legCount,
    postTour,
    spreadOnLeg,
    suggestDrivers,
    type Ledger,
    type Options,
    type Tour,
} from "../src/lib/fairness/model.ts";
import { makeMembers, randomSchedule, rng } from "./helpers.ts";

const RUNS = 60;
const DAYS = 120;

/** Fahrplan abfahren, optional mit zufaellig uebersteuerten Vorschlaegen. */
function simulate(
    members: ReturnType<typeof makeMembers>,
    schedule: { date: string; present: number[] }[],
    opts: Options,
    overrideP = 0,
    seed = 1,
): Tour[] {
    const r = rng(seed);
    const history: Tour[] = [];
    const ledger: Ledger = new Map();

    for (const day of schedule) {
        const suggested = suggestDrivers(members, day.present, ledger, lastDriveDates(history), opts);
        const drivers: number[] = [];

        for (let leg = 1; leg <= legCount(members); leg++) {
            const prev = leg === 1 ? null : drivers[leg - 2];
            const cands = eligibleDrivers(members, day.present, leg, prev);
            let d =
                leg === 1 ? suggested[0]! : cands.includes(suggested[leg - 1] ?? -1) ? suggested[leg - 1]! : cands[0];
            if (cands.length > 1 && r() < overrideP) {
                const others = cands.filter((x) => x !== d);
                d = others[Math.floor(r() * others.length)];
            }
            drivers.push(d);
        }
        const tour = { date: day.date, present: day.present, drivers };
        history.push(tour);
        postTour(ledger, members, tour, opts);
    }
    return history;
}

for (const basis of ["fahrberechtigte", "mitfahrer"] as const) {
    describe(`Invarianten, Massstab ${basis}`, () => {
        const opts: Options = { basis };

        // Schranke gemessen bis 3840 Fahrten: 1.50 (fahrberechtigte) bzw. 1.67
        // (mitfahrer, dort ist die Pflicht breiter als die Fahrberechtigung, ein
        // kleiner Rest bleibt deshalb strukturell stehen). 2.0 laesst Luft.
        test("ohne Eingriffe bleibt die Spreizung je Etappe unter 2", () => {
            for (let seed = 1; seed <= RUNS; seed++) {
                const members = makeMembers(3, 1);
                const sched = randomSchedule(members, DAYS, 0.25, seed);
                const hist = simulate(members, sched, opts, 0, seed);
                for (let leg = 1; leg <= legCount(members); leg++) {
                    const s = spreadOnLeg(members, hist, leg, opts);
                    assert.ok(s < 2.0, `seed ${seed}, Etappe ${leg}: Spreizung ${s.toFixed(2)}`);
                }
            }
        });

        test("gilt auch bei mehr Fahrern und drei Stopps", () => {
            for (let seed = 1; seed <= 20; seed++) {
                const members = [...makeMembers(4, 2), { id: 20, label: "C1", stop: 3, canDrive: true }];
                const sched = randomSchedule(members, DAYS, 0.3, seed + 500);
                const hist = simulate(members, sched, opts, 0, seed);
                for (let leg = 1; leg <= legCount(members); leg++) {
                    const s = spreadOnLeg(members, hist, leg, opts);
                    assert.ok(s <= 3.0, `seed ${seed}, Etappe ${leg}: Spreizung ${s.toFixed(2)}`);
                }
            }
        });

        // Das ist die eigentliche Zusage: der Rueckstand laeuft nicht davon.
        // Waere die Spreizung ein Random Walk, wuechse sie mit sqrt(Anzahl Fahrten) -
        // bei 16-facher Laufzeit also auf das Vierfache.
        test("die Spreizung waechst nicht mit der Laufzeit", () => {
            const members = makeMembers(3, 1);
            for (let seed = 1; seed <= 8; seed++) {
                const lang = simulate(members, randomSchedule(members, 960, 0.25, seed), opts, 0, seed);
                for (let leg = 1; leg <= legCount(members); leg++) {
                    const s = spreadOnLeg(members, lang, leg, opts);
                    assert.ok(s < 2.0, `seed ${seed}, Etappe ${leg}: nach 960 Fahrten Spreizung ${s.toFixed(2)}`);
                }
            }
        });

        test("Summe der Salden je Etappe bleibt null", () => {
            const members = makeMembers(3, 1);
            const hist = simulate(members, randomSchedule(members, DAYS, 0.25, 7), opts, 0.3, 7);
            const ledger = buildLedger(members, hist, opts);
            for (let leg = 1; leg <= legCount(members); leg++) {
                const sum = [...ledger].filter(([k]) => k.endsWith(`|${leg}`)).reduce((a, [, v]) => a + v, 0);
                assert.ok(Math.abs(sum) < 1e-9, `Etappe ${leg} summiert auf ${sum}`);
            }
        });

        test("wer nie dabei ist, taucht in keiner Bilanz auf", () => {
            const members = makeMembers(3, 1);
            const sched = randomSchedule(members, DAYS, 0.25, 3)
                .map((d) => ({ ...d, present: d.present.filter((id) => id !== 3) }))
                .filter((d) => d.present.some((id) => members.find((m) => m.id === id)!.stop === 1));
            const st = evaluateFairness(members, simulate(members, sched, opts, 0, 3), opts);
            assert.equal(st.get("3|1"), undefined);
        });

        test("Verfahren ist reproduzierbar", () => {
            const members = makeMembers(3, 1);
            const sched = randomSchedule(members, 60, 0.25, 11);
            const a = simulate(members, sched, opts, 0, 11).map((t) => t.drivers.join("-"));
            const b = simulate(members, sched, opts, 0, 11).map((t) => t.drivers.join("-"));
            assert.deepEqual(a, b);
        });
    });
}

describe("Selbstkorrektur nach manuellen Eingriffen", () => {
    const opts: Options = { basis: "fahrberechtigte" };

    test("bei 10 % Eingriffen bleibt die Spreizung unter 4", () => {
        for (let seed = 1; seed <= RUNS; seed++) {
            const members = makeMembers(3, 1);
            const hist = simulate(members, randomSchedule(members, DAYS, 0.25, seed), opts, 0.1, seed);
            const s = spreadOnLeg(members, hist, 1, opts);
            assert.ok(s < 4, `seed ${seed}: Spreizung ${s.toFixed(2)}`);
        }
    });

    test("eine erzwungene Schieflage wird wieder abgebaut", () => {
        const members = makeMembers(3, 1);
        const sched = randomSchedule(members, 200, 0.2, 42);
        const ledger: Ledger = new Map();
        const history: Tour[] = [];
        const FORCE = 20;

        sched.forEach((day, i) => {
            const s = suggestDrivers(members, day.present, ledger, lastDriveDates(history), opts);
            const drivers = [...s] as number[];
            if (i < FORCE && eligibleDrivers(members, day.present, 1, null).includes(1)) {
                drivers[0] = 1; // A1 faehrt erzwungen
                drivers[1] = eligibleDrivers(members, day.present, 2, 1)[0];
            }
            const tour = { date: day.date, present: day.present, drivers };
            history.push(tour);
            postTour(ledger, members, tour, opts);
        });

        const nachStoerung = spreadOnLeg(members, history.slice(0, FORCE), 1, opts);
        const amEnde = spreadOnLeg(members, history, 1, opts);
        assert.ok(nachStoerung > 3, `Stoerung war zu schwach: ${nachStoerung.toFixed(2)}`);
        assert.ok(amEnde < 1.5, `nicht ausgeglichen: ${amEnde.toFixed(2)}`);
    });

    test("Eingriffe verschlechtern die Bilanz deutlich weniger als reiner Zufall", () => {
        const members = makeMembers(3, 1);
        const sched = randomSchedule(members, DAYS, 0.25, 5);
        const gesteuert = spreadOnLeg(members, simulate(members, sched, opts, 0.25, 5), 1, opts);
        const zufall = spreadOnLeg(members, simulate(members, sched, opts, 1.0, 5), 1, opts);
        assert.ok(
            gesteuert * 3 < zufall,
            `Steuerung wirkt zu schwach: ${gesteuert.toFixed(2)} vs Zufall ${zufall.toFixed(2)}`,
        );
    });
});

describe("Massstab mitfahrer entlastet den Fahrer am Zwischenstopp", () => {
    test("B-Fahrer faehrt Etappe 2 seltener als unter Massstab fahrberechtigte", () => {
        const members = makeMembers(3, 1);
        const sched = randomSchedule(members, 300, 0.15, 99).filter((d) => d.present.includes(4)); // nur Tage mit B-Fahrer

        const anteil = (basis: "fahrberechtigte" | "mitfahrer") => {
            const h = simulate(members, sched, { basis }, 0, 99);
            return h.filter((t) => t.drivers[1] === 4).length / h.length;
        };
        const a = anteil("fahrberechtigte"),
            b = anteil("mitfahrer");
        assert.ok(a > b + 0.1, `erwartete deutliche Entlastung, war ${a.toFixed(2)} vs ${b.toFixed(2)}`);
    });
});
