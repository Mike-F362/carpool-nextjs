/**
 * Golden-Test gegen die echte Historie (Export vom 13.08.2026, 143 Fahrten).
 *
 * Wichtig: geprueft wird NICHT, ob ein Verfahren dieselben Einzelentscheidungen
 * trifft wie die Historie. Das kann es gar nicht - in der Historie stecken
 * manuelle Uebersteuerungen, geloeschte Simulationsfahrten (45 fehlende IDs)
 * und aeltere Algorithmusstaende. Geprueft wird die Bilanz: stimmt die Summe?
 */

import {test, describe} from 'node:test';
import assert from 'node:assert/strict';
import {evaluateFairness, spreadOnLeg, type Options} from '../src/lib/fairness/model.ts';
import {loadRealFixture} from './helpers.ts';

const {members, tours} = loadRealFixture();
const STOPOVER = members.find(m => m.stop === 2)!;

describe('Fixture ist unveraendert', () => {
    test('vier Fahrer, drei ab Startpunkt', () => {
        assert.equal(members.length, 4);
        assert.equal(members.filter(m => m.stop === 1).length, 3);
        assert.equal(members.filter(m => m.stop === 2).length, 1);
    });

    test('143 Fahrten, alle mit vollstaendiger Fahrerangabe', () => {
        assert.equal(tours.length, 143);
        assert.ok(tours.every(t => t.drivers.every(d => Number.isInteger(d) && d > 0)));
    });

    test('jede Fahrt hat mindestens einen Fahrer ab Startpunkt dabei', () => {
        for (const t of tours) {
            const a = t.present.filter(id => members.find(m => m.id === id)!.stop === 1);
            assert.ok(a.length > 0, `${t.date} ohne Fahrer ab Startpunkt`);
        }
    });

    test('der eingetragene Fahrer war auch anwesend', () => {
        for (const t of tours) {
            assert.ok(t.present.includes(t.drivers[0]), `${t.date}: Fahrer A nicht anwesend`);
            assert.ok(t.present.includes(t.drivers[1]), `${t.date}: Fahrer B nicht anwesend`);
        }
    });
});

describe('Bilanz der echten Historie', () => {
    test('Etappe 1 ist praktisch ausgeglichen', () => {
        const s = spreadOnLeg(members, tours, 1, {basis: 'fahrberechtigte'});
        assert.ok(s <= 0.5 + 1e-9, `Spreizung ${s.toFixed(2)}`);
    });

    test('Etappe 1: die drei Startpunktfahrer liegen bei 43 / 46 / 54', () => {
        const n = (label: string) => tours.filter(
            t => t.drivers[0] === members.find(m => m.label === label)!.id).length;
        assert.equal(n('P1'), 43);
        assert.equal(n('P2'), 46);
        assert.equal(n('P3'), 54);
    });

    test('nach heutiger Regel faehrt der Zwischenstopp-Fahrer sein Soll', () => {
        const st = evaluateFairness(members, tours, {basis: 'fahrberechtigte'});
        const f = st.get(`${STOPOVER.id}|2`)!;
        assert.equal(f.ist, 27);
        assert.ok(Math.abs(f.delta) <= 0.5, `Delta ${f.delta.toFixed(2)}`);
    });

    // Der Punkt, an dem sich der Fahrer am Zwischenstopp benachteiligt fuehlt.
    test('nach der Mitfahrer-Regel faehrt er rund fuenf Fahrten zu viel', () => {
        const st = evaluateFairness(members, tours, {basis: 'mitfahrer'});
        const f = st.get(`${STOPOVER.id}|2`)!;
        assert.ok(f.delta > 4 && f.delta < 6, `Delta ${f.delta.toFixed(2)}, erwartet ~5.2`);
    });

    test('sein Anteil an Etappe 2 liegt unabhaengig von der Gruppengroesse bei rund 50 %', () => {
        for (const n of [3, 4]) {
            const g = tours.filter(t => t.present.includes(STOPOVER.id) && t.present.length === n);
            const anteil = g.filter(t => t.drivers[1] === STOPOVER.id).length / g.length;
            assert.ok(Math.abs(anteil - 0.5) < 0.1,
                `bei ${n} Personen: ${(anteil * 100).toFixed(0)} %`);
        }
    });
});

describe('Massstaebe widersprechen sich erwartungsgemaess', () => {
    test('was unter einem Massstab fair ist, ist unter dem anderen schief', () => {
        const a = spreadOnLeg(members, tours, 2, {basis: 'fahrberechtigte'});
        const b = spreadOnLeg(members, tours, 2, {basis: 'mitfahrer'});
        assert.ok(a < 1.5, `Massstab fahrberechtigte: ${a.toFixed(2)}`);
        assert.ok(b > 5, `Massstab mitfahrer: ${b.toFixed(2)}`);
    });
});

describe('Etappengewichte', () => {
    test('gleiche Gewichte aendern nichts gegenueber dem Default', () => {
        const o: Options = {basis: 'fahrberechtigte'};
        assert.equal(
            spreadOnLeg(members, tours, 1, o),
            spreadOnLeg(members, tours, 1, {...o, weights: [1, 1]}),
        );
    });

    test('doppeltes Gewicht verdoppelt die Abweichung', () => {
        const o: Options = {basis: 'fahrberechtigte'};
        const einfach = spreadOnLeg(members, tours, 1, o);
        const doppelt = spreadOnLeg(members, tours, 1, {...o, weights: [2, 1]});
        assert.ok(Math.abs(doppelt - 2 * einfach) < 1e-9);
    });
});
