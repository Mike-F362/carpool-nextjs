/**
 * Die Quotenberechnung liest die Fahrten einmal und bildet alle Toepfe in
 * einem Durchlauf. Vorher lief je Anwesenheitsmenge - am Zwischenstopp je
 * Fahrer *und* Menge - eine eigene Abfrage, die jedes Mal die ganze Tabelle
 * holte und auf genau einen Topf herunterfilterte.
 *
 * Dieser Test haelt die alte Fassung als Referenz fest und vergleicht sie an
 * der echten Historie mit der neuen. Gleiches Ergebnis, weniger Abfragen -
 * anders waere die Umstellung nicht zu rechtfertigen.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
    groupQuotesSp,
    groupQuotesZw,
    type FahrtZw,
    type QuotesSp,
    type QuotesZw,
} from "../src/pages/api/fahrer/calc_qoutes.ts";
import { FIXTURES } from "./helpers.ts";

function ladeFahrten(): FahrtZw[] {
    const text = fs.readFileSync(path.join(FIXTURES, "fahrten.csv"), "utf8").trim();
    return text
        .split("\n")
        .slice(1)
        .map((zeile) => {
            const m = zeile.match(/^([^,]*),([^,]*),([^,]*),"?(\[[^\]]*\])"?,([^,]*),([^,]*)$/);
            assert.ok(m, `CSV nicht parsebar: ${zeile}`);
            return {
                anwesend_ids: JSON.parse(m[4]) as number[],
                fahrerA_id: m[5] ? Number(m[5]) : null,
                fahrerB_id: m[6] ? Number(m[6]) : null,
            };
        });
}

function ladeFahrer(): { id: number; startpunkt: number }[] {
    const text = fs.readFileSync(path.join(FIXTURES, "fahrer.csv"), "utf8").trim();
    return text
        .split("\n")
        .slice(1)
        .map((zeile) => {
            const s = zeile.split(",");
            return { id: Number(s[0]), startpunkt: Number(s[3]) };
        });
}

/** Mengenvergleich der alten Fassung: Duplikate und Reihenfolge egal. */
function eqArraySet(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;
    const setA = new Set(a);
    const setB = new Set(b);
    for (const val of setA) if (!setB.has(val)) return false;
    return true;
}

/** Verschiedene Anwesenheitsmengen, wie sie get_unique_attendance_ids liefert. */
function eindeutigeMengen(fahrten: FahrtZw[], ausgeschlossen: Set<number>): number[][] {
    const gesehen = new Map<string, number[]>();
    for (const f of fahrten) {
        const ids = (f.anwesend_ids ?? []).filter((id) => !ausgeschlossen.has(id)).sort((a, b) => a - b);
        if (!ids.length) continue;
        gesehen.set(ids.join("-"), ids);
    }
    return [...gesehen.values()];
}

/** Alte Fassung: eine Abfrage je Menge, danach filtern. */
function referenzSp(fahrten: FahrtZw[], zwischenIds: Set<number>): QuotesSp {
    const quotes: QuotesSp = {};
    for (const anwesend of eindeutigeMengen(fahrten, zwischenIds)) {
        const counter = new Map<string, number>();
        for (const fahrt of fahrten) {
            const aktuell = (fahrt.anwesend_ids ?? []).filter((id) => !zwischenIds.has(id));
            if (eqArraySet(aktuell, anwesend)) {
                const key = String(fahrt.fahrerA_id);
                counter.set(key, (counter.get(key) ?? 0) + 1);
            }
        }
        quotes[anwesend.join("-")] = Object.fromEntries(counter);
    }
    return quotes;
}

/** Alte Fassung: eine Abfrage je Startpunktfahrer und Menge. */
function referenzZw(fahrten: FahrtZw[], startPunktIds: Set<number>): QuotesZw {
    const quotes: QuotesZw = {};
    for (const spid of startPunktIds) {
        const proFahrer: QuotesSp = {};
        for (const anwesend of eindeutigeMengen(fahrten, startPunktIds)) {
            const counter = new Map<string, number>();
            for (const fahrt of fahrten.filter((f) => f.fahrerA_id === spid)) {
                const aktuell = (fahrt.anwesend_ids ?? []).filter((id) => !startPunktIds.has(id));
                if (eqArraySet(aktuell, anwesend)) {
                    const key = String(fahrt.fahrerB_id);
                    counter.set(key, (counter.get(key) ?? 0) + 1);
                }
            }
            proFahrer[anwesend.join("-")] = Object.fromEntries(counter);
        }
        quotes[String(spid)] = proFahrer;
    }
    return quotes;
}

/** Leere Toepfe: die alte Fassung legte sie an, die neue laesst sie weg. */
function ohneLeere(quotes: QuotesSp): QuotesSp {
    return Object.fromEntries(Object.entries(quotes).filter(([, wert]) => Object.keys(wert).length > 0));
}

describe("Quoten je Anwesenheitsmenge", () => {
    const fahrten = ladeFahrten();
    const fahrer = ladeFahrer();
    const zwischenIds = new Set(fahrer.filter((f) => f.startpunkt === 2).map((f) => f.id));
    const startPunktIds = new Set(fahrer.filter((f) => f.startpunkt === 1).map((f) => f.id));

    test("Fixture ist die erwartete Historie", () => {
        assert.equal(fahrten.length, 143);
        assert.equal(startPunktIds.size, 3);
        assert.equal(zwischenIds.size, 1);
    });

    test("Etappe 1 stimmt mit der Referenz ueberein", () => {
        assert.deepEqual(groupQuotesSp(fahrten, zwischenIds), referenzSp(fahrten, zwischenIds));
    });

    test("Etappe 2 stimmt mit der Referenz ueberein", () => {
        const neu = groupQuotesZw(fahrten, startPunktIds);
        const referenz = referenzZw(fahrten, startPunktIds);

        // Die alte Fassung lief ueber das Kreuzprodukt aus Fahrern und Mengen
        // und legte auch fuer nie vorgekommene Kombinationen einen leeren Topf
        // an. Das UI liest die mit `|| new Map()`, sieht also keinen
        // Unterschied - deshalb werden leere Toepfe vor dem Vergleich entfernt.
        const referenzOhneLeere = Object.fromEntries(
            Object.entries(referenz)
                .map(([fahrer, toepfe]) => [fahrer, ohneLeere(toepfe)])
                .filter(([, toepfe]) => Object.keys(toepfe as QuotesSp).length > 0),
        );

        assert.deepEqual(neu, referenzOhneLeere);
    });

    test("Summe der Toepfe entspricht der Zahl der Fahrten", () => {
        // Jede Fahrt zaehlt in genau einen Topf - kein Doppelzaehlen durch die
        // Gruppierung, keine verlorene Fahrt.
        const summe = Object.values(groupQuotesSp(fahrten, zwischenIds))
            .flatMap((topf) => Object.values(topf))
            .reduce((a, b) => a + b, 0);

        assert.equal(summe, fahrten.length);
    });

    test("Fahrten ohne verbleibende Anwesende bilden keinen Topf", () => {
        const nurZwischenstopp = [{ anwesend_ids: [10], fahrerA_id: 4, fahrerB_id: 10 }];

        assert.deepEqual(groupQuotesSp(nurZwischenstopp, zwischenIds), {});
    });

    test("Schluessel sind numerisch sortiert, nicht lexikografisch", () => {
        // "5-11" und nicht "11-5": get_unique_attendance_ids aggregiert
        // ORDER BY id, und genau so sucht das UI den Topf.
        const quotes = groupQuotesSp([{ anwesend_ids: [11, 5], fahrerA_id: 5 }], zwischenIds);

        assert.deepEqual(Object.keys(quotes), ["5-11"]);
    });
});
