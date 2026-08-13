import {test, describe} from 'node:test';
import assert from 'node:assert/strict';
import {
    chooseDriver, eligibleDrivers, evaluateFairness, legCount, localDateString,
    obligedFor, postTour, ridersOnLeg, suggestDrivers, type Ledger, type Member, type Options,
} from '../src/lib/fairness/model.ts';
import {makeMembers} from './helpers.ts';

const OPT: Options = {basis: 'fahrberechtigte'};
const M = makeMembers(3, 1);                 // A1 A2 A3 ab Stopp 1, B1 ab Stopp 2
const ALL = [1, 2, 3, 4];

describe('Etappenzahl leitet sich aus den Stopps ab', () => {
    test('zwei Stopps -> zwei Etappen', () => assert.equal(legCount(makeMembers(3, 1)), 2));
    test('drei Stopps -> drei Etappen', () => {
        const m = [...makeMembers(2, 1), {id: 99, label: 'C1', stop: 3, canDrive: true}];
        assert.equal(legCount(m), 3);
    });
    test('nur ein Stopp -> eine Etappe', () => assert.equal(legCount(makeMembers(2, 0)), 1));
});

describe('Fahrberechtigung folgt dem Fahrzeug', () => {
    test('Etappe 1: nur Zusteiger am Startpunkt', () => {
        assert.deepEqual(eligibleDrivers(M, ALL, 1, null), [1, 2, 3]);
    });

    test('Etappe 2: B-Fahrer plus der ankommende Fahrer, nicht die uebrigen A', () => {
        assert.deepEqual(eligibleDrivers(M, ALL, 2, 2), [2, 4]);
    });

    test('ohne B-Fahrer bleibt nur der ankommende Fahrer uebrig', () => {
        assert.deepEqual(eligibleDrivers(M, [1, 2, 3], 2, 1), [1]);
    });

    test('wer nicht fahren darf, taucht nie auf', () => {
        const m: Member[] = [{id: 1, label: 'A1', stop: 1, canDrive: true},
            {id: 2, label: 'A2', stop: 1, canDrive: false}];
        assert.deepEqual(eligibleDrivers(m, [1, 2], 1, null), [1]);
    });
});

describe('Mitfahrer je Etappe', () => {
    test('Etappe 1 ohne die, die erst am Zwischenstopp zusteigen', () => {
        assert.deepEqual(ridersOnLeg(M, ALL, 1), [1, 2, 3]);
    });
    test('Etappe 2 mit allen', () => {
        assert.deepEqual(ridersOnLeg(M, ALL, 2), [1, 2, 3, 4]);
    });
});

describe('Pflichtige je Massstab', () => {
    test('Massstab fahrberechtigte: nur ankommender Fahrer und B-Fahrer', () => {
        assert.deepEqual(obligedFor(M, ALL, 2, 1, 'fahrberechtigte'), [1, 4]);
    });
    test('Massstab mitfahrer: alle Insassen', () => {
        assert.deepEqual(obligedFor(M, ALL, 2, 1, 'mitfahrer'), [1, 2, 3, 4]);
    });
});

describe('Auswahl ist deterministisch', () => {
    test('kleinstes Saldo gewinnt', () => {
        const l: Ledger = new Map([['1|1', 2], ['2|1', -1], ['3|1', 0]]);
        assert.equal(chooseDriver([1, 2, 3], l, 1, new Map()), 2);
    });

    test('bei Gleichstand entscheidet das aeltere letzte Fahrdatum', () => {
        const last = new Map([[1, '2026-01-10'], [2, '2026-01-03'], [3, '2026-01-08']]);
        assert.equal(chooseDriver([1, 2, 3], new Map(), 1, last), 2);
    });

    test('wer noch nie gefahren ist, kommt vor allen anderen', () => {
        const last = new Map([[1, '2026-01-01'], [2, '2026-01-02']]);
        assert.equal(chooseDriver([1, 2, 3], new Map(), 1, last), 3);
    });

    test('vollstaendiger Gleichstand loest sich ueber die Id auf', () => {
        assert.equal(chooseDriver([3, 1, 2], new Map(), 1, new Map()), 1);
    });

    test('gleiche Eingabe, gleiches Ergebnis - auch bei anderer Reihenfolge', () => {
        const l: Ledger = new Map([['1|1', 1], ['2|1', 1], ['3|1', 1]]);
        assert.equal(chooseDriver([1, 2, 3], l, 1, new Map()), chooseDriver([3, 2, 1], l, 1, new Map()));
    });

    test('leere Kandidatenliste ergibt null statt undefined', () => {
        assert.equal(chooseDriver([], new Map(), 1, new Map()), null);
    });

    // Regression: die App nutzte `quotes.get(a) | 0`. Bitweises ODER schneidet
    // auf Int32 ab und macht aus Bruchzahlen ganze Zahlen.
    test('Bruchzahlen im Saldo werden nicht abgeschnitten', () => {
        const l: Ledger = new Map([['1|1', 0.4], ['2|1', 0.6]]);
        assert.equal(chooseDriver([1, 2], l, 1, new Map()), 1);
    });

    test('sehr grosse Salden kippen nicht ins Negative', () => {
        const l: Ledger = new Map([['1|1', 2 ** 31 + 5], ['2|1', 2 ** 31 + 1]]);
        assert.equal(chooseDriver([1, 2], l, 1, new Map()), 2);
    });
});

describe('Buchung', () => {
    test('erzwungene Fahrt ohne Alternative laesst das Saldo unveraendert', () => {
        const l: Ledger = new Map();
        postTour(l, M, {date: '2026-01-05', present: [1, 2, 3], drivers: [1, 1]}, OPT);
        // Etappe 2 hatte nur einen Kandidaten -> soll 1, ist 1
        assert.equal(l.get('1|2'), 0);
    });

    test('Nichtanwesende werden nicht belastet', () => {
        const l: Ledger = new Map();
        postTour(l, M, {date: '2026-01-05', present: [1, 2], drivers: [1, 1]}, OPT);
        assert.equal(l.get('3|1'), undefined);
        assert.equal(l.get('4|2'), undefined);
    });

    test('Summe aller Salden je Etappe ist null', () => {
        const l: Ledger = new Map();
        postTour(l, M, {date: '2026-01-05', present: ALL, drivers: [2, 4]}, OPT);
        for (const leg of [1, 2]) {
            const sum = [...l].filter(([k]) => k.endsWith(`|${leg}`)).reduce((a, [, v]) => a + v, 0);
            assert.ok(Math.abs(sum) < 1e-9, `Etappe ${leg} summiert auf ${sum}`);
        }
    });

    test('Etappengewichte schlagen durch', () => {
        const l: Ledger = new Map();
        postTour(l, M, {date: '2026-01-05', present: ALL, drivers: [1, 4]},
            {basis: 'fahrberechtigte', weights: [10, 1]});
        assert.ok(Math.abs(l.get('1|1')! - (10 - 10 / 3)) < 1e-9);
    });
});

describe('Vorschlag ueber alle Etappen', () => {
    test('Etappe 2 beruecksichtigt die Wahl auf Etappe 1', () => {
        const s = suggestDrivers(M, ALL, new Map(), new Map(), OPT);
        assert.equal(s.length, 2);
        assert.ok(eligibleDrivers(M, ALL, 2, s[0]!).includes(s[1]!));
    });

    test('ohne B-Fahrer faehrt der A-Fahrer beide Etappen', () => {
        const s = suggestDrivers(M, [1, 2, 3], new Map(), new Map(), OPT);
        assert.equal(s[0], s[1]);
    });
});

describe('Bewertung', () => {
    test('bei konstanter Besetzung entsteht reihum-Verteilung', () => {
        const hist = [
            {date: '2026-01-05', present: [1, 2, 3], drivers: [1, 1]},
            {date: '2026-01-06', present: [1, 2, 3], drivers: [2, 2]},
            {date: '2026-01-07', present: [1, 2, 3], drivers: [3, 3]},
        ];
        const st = evaluateFairness(M, hist, OPT);
        for (const id of [1, 2, 3]) {
            assert.ok(Math.abs(st.get(`${id}|1`)!.delta) < 1e-9);
        }
    });
});

describe('Datum ohne Zeitzonenfalle', () => {
    // Regression: currentDate.toISOString().split('T')[0] verschiebt in MESZ
    // ein Datum um Mitternacht auf den Vortag.
    test('lokale Mitternacht bleibt derselbe Tag', () => {
        const d = new Date(2026, 6, 15, 0, 30);
        assert.equal(localDateString(d), '2026-07-15');
    });
    test('Monats- und Tageszahlen sind zweistellig', () => {
        assert.equal(localDateString(new Date(2026, 0, 3)), '2026-01-03');
    });
});
