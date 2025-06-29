"use client";

import {supabase} from "@/lib/supabaseClient";
import React, {RefObject, useState} from "react";
import Tour from "@/interfaces/tour";
import Driver from "@/interfaces/driver";
import FahrerVorschlag from "@/interfaces/driver_suggestion";
import {supabase} from "@/lib/supabaseClient";

type Props = {
    anwesenheiten: Array<Set<string>>,
    daten: Tour[],
    fahrerListe: Driver[],
    setDaten: (d: any[]) => void,
    setNeuerTagAktiv: (v: boolean) => void,
    mitglieder: Driver[],
    setAnwesenheiten: (liste: Set<number>[]) => void,
    startpunkt1: number[],
    tableContainerRef: React.RefObject<HTMLDivElement>,
    zwischenstopp: number[],
    fahrtSpeichern: (datum: Date, aktuelleAnwesenheit: Set<number>, aktuellerVorschlag: FahrerVorschlag) => void,
    datum: Date,
    setDatum: (value: (((prevState: Date) => Date) | Date)) => void,
    ladeFahrten: () => Promise<void>
};

export default function NeuerTag({
                                     anwesenheiten,
                                     daten,
                                     fahrerListe,
                                     setDaten,
                                     setNeuerTagAktiv,
                                     mitglieder,
                                     startpunkt1,
                                     tableContainerRef,
                                     fahrtSpeichern,
                                     zwischenstopp,
                                     datum,
                                     setDatum,
                                     ladeFahrten
                                 }: Props) {
    const [aktuellerVorschlag, setAktuellerVorschlag] = useState<FahrerVorschlag>({fahrerA_id: 0, fahrerB_id: 0});
    const [aktuelleAnwesenheit, setAktuelleAnwesenheit] = useState(new Set<number>());
    const [quotesZw, setQuotesZw] = useState(new Map<number, number>);
    const [quotesSp, setQuotesSp] = useState(new Map<number, number>);

    const simulate = async () => {
        const aktuelleAnwesenheit = new Set<number>(mitglieder.map(m => m.id));
        const aktuellerVorschlag = await berechneFahrerVorschlag(aktuelleAnwesenheit, daten, anwesenheiten);

        let datum = daten.map(d => d.datum).reduce((prev, curr, index, arr) => {
            return prev > curr ? prev : curr
        }, new Date());

        let simDatum = new Date(datum);
        do {
            simDatum.setDate(simDatum.getDate() + 1);
        } while (simDatum.getDay() === 0 || simDatum.getDay() === 6); // Sa+So überspringen

        // const tag = daten.length + 1;
        const anwesend = Array.from(aktuelleAnwesenheit);
        const fahrer = aktuellerVorschlag;
        const fahrt: Tour = {
            datum: simDatum,
            anwesend_ids: anwesend,
            fahrerA_id: fahrer.fahrerA_id,
            fahrerB_id: fahrer.fahrerB_id
        };

        await supabase.from("fahrten").insert(fahrt);

        setAktuellerVorschlag(aktuellerVorschlag);
        setDatum(simDatum);
        setDaten([fahrt, ...daten]);
        setAktuelleAnwesenheit(aktuelleAnwesenheit);

        ladeFahrten();

        setTimeout(() => {
            tableContainerRef.current?.scrollTo({top: 0, behavior: 'smooth'});
        }, 100);

    }

    async function ladeFahrerQuoteSp(anwesend: number[]): Promise<Map<number, number>> {
        try {
            const res = await fetch("/api/fahrer/quote", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({anwesend}),
            });

            if (!res.ok) {
                console.error("Fehler beim Abrufen der Fahrerquote");
                return;
            }

            const quotes: Object = await res.json();
            const quoteMap: Map<number, number> = new Map(Object.entries(quotes).map(([key, value]) => {
                return [parseInt(key), value];
            }));
            console.log("QuoteSp:", quoteMap);

            setQuotesSp(quoteMap);

            return quoteMap;
        } catch (error) {
            console.error("Netzwerkfehler:", error);
        }
    }

    async function ladeFahrerQuoteZw(fahrerA_id: number, anwesend: number[]): Promise<Map<number, number>> {
        try {
            const res = await fetch("/api/fahrer/quote_zw", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({fahrerA_id: fahrerA_id, anwesend}),
            });

            if (!res.ok) {
                console.error("Fehler beim Abrufen der Fahrerquote");
                return;
            }

            const quotes: Object = await res.json();
            const quoteMap: Map<number, number> = new Map(Object.entries(quotes).map(([key, value]) => {
                return [parseInt(key), value];
            }));
            console.log("QuoteZw:", quoteMap);

            setQuotesZw(quoteMap);

            return quoteMap;
        } catch (error) {
            console.error("Netzwerkfehler:", error);
        }
    }

    function nextDriver(anwesend2: number[], quoteZw: Map<number, number>) {
        anwesend2.sort((a, b) => {
            // TODO: bei Gleichstand: Datum letzte Fahrt vergleichen!
            return ((quoteZw.get(a) | 0) - (quoteZw.get(b) | 0));
        });

        const fahrerB_id = anwesend2[0];
        const fahrerB = fahrerListe.find(fahrer => fahrer.id == fahrerB_id)
        const fahrerB_text = fahrerB || "?";
        return {fahrer_id: fahrerB_id, fahrer_text: fahrerB_text};
    }

    async function berechneFahrerVorschlag(anwesend: Set<number>, daten, anwesenheiten): Promise<FahrerVorschlag> {
        const anwesend1 = Array.from(anwesend)
            .filter(n => startpunkt1.includes(n));

        const quoteSp = await ladeFahrerQuoteSp(anwesend1);

        const {fahrer_id: fahrerA_id, fahrer_text: fahrerA_text} = nextDriver(anwesend1, quoteSp);

        console.log(`Fahrer A ${fahrerA_text} quote`, quoteSp);

        const anwesend2 = Array.from(anwesend)
            .filter(n => zwischenstopp.includes(n) && !startpunkt1.includes(n));

        const quoteZw = await ladeFahrerQuoteZw(fahrerA_id, anwesend2);

        anwesend2.push(fahrerA_id);
        const {fahrer_id: fahrerB_id, fahrer_text: fahrerB_text} = nextDriver(anwesend2, quoteZw);

        console.log(`Fahrer B ${fahrerB_text} quote`, quoteSp);

        return {
            fahrerA_id,
            fahrerB_id
        };
    }

    const toggleAnwesenheit = async (id: number) => {
        const kopie = new Set<number>(aktuelleAnwesenheit);
        if (kopie.has(id)) kopie.delete(id);
        else kopie.add(id);
        setAktuelleAnwesenheit(kopie);
        setAktuellerVorschlag(simuliereFahrt(kopie, daten, anwesenheiten));
    };

    return (
        <div className="card p-3 mb-3">
            <div className="mb-3">
                <label htmlFor="datum" className="form-label"><strong>Datum der Fahrt:</strong></label>
                <input type="date" className="form-control" id="datum" value={datum.toISOString().split("T")[0]} onChange={e => setDatum(new Date(e.target.value || ''))}/>
            </div>
            <h5>Wer ist da?</h5>
            {mitglieder.map(mitglied => (
                <div className="form-check" key={mitglied.id}>
                    <input className="form-check-input" type="checkbox" id={mitglied.name} checked={aktuelleAnwesenheit.has(mitglied.name)} onChange={() => toggleAnwesenheit(mitglied.name)}/>
                    <label className="form-check-label" htmlFor={mitglied.name}>{mitglied.name}</label>
                </div>
            ))}
            <div className="mt-3">
                <div className="mb-2">
                    <label htmlFor="fahrerA" className="form-label"><strong>Fahrer ab Startpunkt 1:</strong></label>
                    <select className="form-select" id="fahrerA" value={aktuellerVorschlag.fahrerA} onChange={e => setAktuellerVorschlag({...aktuellerVorschlag, fahrerA: e.target.value})}>
                        <option value="">Wählen...</option>
                        {Array.from(aktuelleAnwesenheit).filter(name => startpunkt1.includes(name)).map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                </div>
                <div className="mb-2">
                    <label htmlFor="fahrerB" className="form-label"><strong>Fahrer ab Zwischenstopp:</strong></label>
                    <select className="form-select" id="fahrerB" value={aktuellerVorschlag.fahrerB} onChange={e => setAktuellerVorschlag({...aktuellerVorschlag, fahrerB: e.target.value})}>
                        <option value="">Wählen...</option>
                        {Array.from(aktuelleAnwesenheit).filter(name => zwischenstopp.includes(name)).map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                </div>
            </div>
            <button className="btn btn-success mt-2" onClick={() => fahrtSpeichern(datum, aktuelleAnwesenheit, aktuellerVorschlag)}>Speichern</button>
        </div>
    );
}



