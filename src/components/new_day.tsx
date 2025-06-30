"use client";

import React, {useEffect, useState} from "react";
import Tour from "@/interfaces/tour";
import Driver from "@/interfaces/driver";
import FahrerVorschlag from "@/interfaces/driver_suggestion";
import {supabase} from "@/lib/supabaseClient";

type Props = {
    anwesenheiten: Array<Set<number>>,
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
    ladeFahrten: () => Promise<void>,
    allQuotesSp: Map<any, any>,
    allQuotesZw: Map<any, any>,
    loading: boolean,
    initFahrerQuotes?: () => Promise<void>,
    isAdmin: boolean
};

export default function NeuerTag({
                                     anwesenheiten,
                                     daten,
                                     fahrerListe,
                                     setDaten,
                                     mitglieder,
                                     startpunkt1,
                                     tableContainerRef,
                                     fahrtSpeichern,
                                     zwischenstopp,
                                     datum,
                                     setDatum,
                                     ladeFahrten,
                                     allQuotesSp,
                                     allQuotesZw,
                                     loading,
                                     initFahrerQuotes,
                                     isAdmin
                                 }: Props) {
    const [aktuellerVorschlag, setAktuellerVorschlag] = useState<FahrerVorschlag>({fahrerA_id: 0, fahrerB_id: 0});
    const [aktuelleAnwesenheit, setAktuelleAnwesenheit] = useState(new Set<number>());
    const [quotesZw, setQuotesZw] = useState(new Map<number, number>);
    const [quotesSp, setQuotesSp] = useState(new Map<number, number>);

    useEffect(() => {
        const init = async () => {
            if (daten && daten.length) {
                const letzteAnwesenheit = anwesenheiten[daten.length-1];

                setAktuelleAnwesenheit(new Set(letzteAnwesenheit));

                if (letzteAnwesenheit.size > 1) {
                    setAktuellerVorschlag(await berechneFahrerVorschlag(letzteAnwesenheit));
                } else {
                    setAktuellerVorschlag({fahrerA_id: 0, fahrerB_id: 0});
                }
            }
        };

        init();
    }, []);

    const simulate = async () => {
        const aktuelleAnwesenheit = new Set<number>(mitglieder.map(m => m.id));
        const aktuellerVorschlag = await berechneFahrerVorschlag(aktuelleAnwesenheit);

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
        initFahrerQuotes();

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
        const fahrerB_text = fahrerB?.label || "?";
        return {fahrer_id: fahrerB_id, fahrer_text: fahrerB_text};
    }

    async function berechneFahrerVorschlag(anwesend: Set<number>): Promise<FahrerVorschlag> {
        const fahrerA_id = await berechneFahrerVorschlagSp(anwesend);
        const fahrerB_id = await berechneFahrerVorschlagZw(fahrerA_id, anwesend);

        return {
            fahrerA_id,
            fahrerB_id
        };

    }

    async function berechneFahrerVorschlagSp(anwesend: Set<number>): Promise<number> {
        const anwesend1 = Array.from(anwesend)
            .filter(n => startpunkt1.includes(n));

        const anwesendSp = Array.from(anwesend).filter(n => startpunkt1.includes(n));

        // const quoteSp = await ladeFahrerQuoteSp(anwesend1);
        const quotesSpKey = Array.from(anwesendSp).join('-');
        const quoteSp = allQuotesSp.get(quotesSpKey) || new Map();
        setQuotesSp(quoteSp);

        const {fahrer_id: fahrerA_id, fahrer_text: fahrerA_text} = nextDriver(anwesend1, quoteSp);

        console.log(`Fahrer A ${fahrerA_text} quote`, quoteSp);

        return fahrerA_id;
    }

    async function berechneFahrerVorschlagZw(fahrerA_id: number, anwesend: Set<number>): Promise<number> {
        const anwesendZw = Array.from(anwesend).filter(n => zwischenstopp.includes(n) && !startpunkt1.includes(n));

        // const quoteZw = await ladeFahrerQuoteZw(fahrerA_id, anwesendZw);
        const driverQuotesZw = allQuotesZw.get(fahrerA_id) || new Map();
        const quotesZwKey = Array.from(anwesendZw).join('-');
        const quoteZw = driverQuotesZw.get(quotesZwKey) || new Map();
        setQuotesZw(quoteZw);

        anwesendZw.push(fahrerA_id);
        const {fahrer_id: fahrerB_id, fahrer_text: fahrerB_text} = nextDriver(anwesendZw, quoteZw);

        console.log(`Fahrer B ${fahrerB_text} quote`, quoteZw);

        return fahrerB_id
    }

    const toggleAnwesenheit = async (id: number) => {
        const kopie = new Set<number>(aktuelleAnwesenheit);
        if (kopie.has(id)) kopie.delete(id);
        else kopie.add(id);
        setAktuelleAnwesenheit(kopie);

        if (kopie.size > 1) {
            setAktuellerVorschlag(await berechneFahrerVorschlag(kopie));
        } else {
            setAktuellerVorschlag({fahrerA_id: 0, fahrerB_id: 0});
        }
    };

    function getDriverLabel(id: number) {
        return fahrerListe.find(fahrer => fahrer.id === id).label;
    }

    function getDriverQuoteSp(driver: Driver) {
        let res = "";

        if (quotesSp && aktuelleAnwesenheit.size > 1 && aktuelleAnwesenheit.has(driver.id)) {
            const quoteSp = (driver.startpunkt === 1) ? quotesSp.get(driver.id) | 0 : '-';
            res += String(quoteSp).padStart(4, ' ');
            res += ' x';
        }

        return res;
    }

    function getDriverQuoteZw(driver: Driver) {
        let res = "";

        if (aktuelleAnwesenheit.size > 1 && aktuelleAnwesenheit.has(driver.id)) {
            const quoteZw = (driver.startpunkt === 2 || driver.id === aktuellerVorschlag.fahrerA_id) ? quotesZw.get(driver.id) | 0 : '-';
            res += String(quoteZw).padStart(4, ' ');
            res += ' x';
        }

        return res;
    }

    function istDranSp(mitglied: Driver) {
        return aktuellerVorschlag.fahrerA_id === mitglied.id;
    }

    function istDranZw(mitglied: Driver) {
        const nurZw = new Set(zwischenstopp).difference(new Set(startpunkt1));

        return (!!aktuelleAnwesenheit.intersection(nurZw).size) && aktuellerVorschlag.fahrerB_id === mitglied.id;
    }

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center p-4">
                <div className="spinner-border" role="status">
                    <span className="visually-hidden">Lädt...</span>
                </div>
                <div className="text-center p-4">🔄 Lädt Neue Tour...</div>
            </div>
        );
    }

    async function resetForm() {
        const vorschlag = await berechneFahrerVorschlag(aktuelleAnwesenheit);
        setAktuellerVorschlag(vorschlag);
    }

    return (
        <div className="card p-3 mb-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
                {isAdmin && (<button className="btn btn-info mb-3" onClick={simulate}>Simulation</button>)
                }
                <button className="btn btn-outline-secondary btn-sm" onClick={resetForm}>
                    ♻️ Zurücksetzen
                </button>
            </div>

            <div className="mb-3">
                <label htmlFor="datum" className="form-label"><strong>Datum der Fahrt:</strong></label>
                <input type="date" className="form-control" id="datum" value={datum.toISOString().split("T")[0]} onChange={e => setDatum(new Date(e.target.value || ''))}/>
            </div>
            <h5>Wer ist da?</h5>
            {mitglieder.map(mitglied => (
                <div className={
                    "list-group-item d-flex justify-content-between align-items-center"} key={mitglied.id}>
                    <div className="d-flex align-items-center">
                        <input className="form-check-input me-2" type="checkbox" id={mitglied.name} checked={aktuelleAnwesenheit.has(mitglied.id)} onChange={() => toggleAnwesenheit(mitglied.id)}/>
                    </div>
                    <div className="d-flex align-items-center justify-content-between w-100">
                        <span>{mitglied.label}</span>
                        <span style={{width: "6rem", textAlign: "right"}}>
                         <span style={{minWidth: "5rem"}} className="d-flex justify-content-end gap-1">
                            {istDranSp(mitglied) && <span className="badge bg-warning text-dark">🚗</span>}
                             {istDranZw(mitglied) && <span className="badge bg-primary">🚗</span>}
                        </span>
                        </span>
                    </div>
                    <div className="d-flex gap-2" style={{minWidth: "5rem", justifyContent: "flex-end"}}>
                        <span className="text-end text-muted" style={{width: "3rem"}}>
                          {getDriverQuoteSp(mitglied)}
                        </span>
                        <span className="text-end text-muted" style={{width: "3rem"}}>
                          {getDriverQuoteZw(mitglied)}
                        </span>
                    </div>
                </div>
            ))}
            <div className="mt-3">
                <div className="mb-2">
                    <label htmlFor="fahrerA" className="form-label"><strong>Fahrer ab Startpunkt 1:</strong></label>
                    <select className="form-select" id="fahrerA" value={aktuellerVorschlag.fahrerA_id}
                            onChange={async e => {
                                const fahrerA_id = parseInt(e.target.value) | 0;

                                let fahrerB_id = await berechneFahrerVorschlagZw(fahrerA_id, aktuelleAnwesenheit);

                                if (startpunkt1.includes(fahrerB_id) && aktuellerVorschlag.fahrerB_id === fahrerB_id) {
                                    fahrerB_id = fahrerA_id;
                                }
                                setAktuellerVorschlag({...aktuellerVorschlag, fahrerA_id, fahrerB_id});
                            }}>
                        <option value="">Wählen...</option>
                        {
                            Array.from(aktuelleAnwesenheit)
                                .filter(id => startpunkt1.includes(id))
                                .map(id => <option key={id} value={id}>{getDriverLabel(id)}</option>)
                        }
                    </select>
                </div>
                <div className="mb-2">
                    <label htmlFor="fahrerB" className="form-label"><strong>Fahrer ab Zwischenstopp:</strong></label>
                    <select className="form-select" id="fahrerB" value={aktuellerVorschlag.fahrerB_id}
                            onChange={e => setAktuellerVorschlag({...aktuellerVorschlag, fahrerB_id: parseInt(e.target.value) | 0})}>
                        <option value="">Wählen...</option>
                        {Array.from(aktuelleAnwesenheit)
                            .filter(id => zwischenstopp.includes(id) &&
                                (!startpunkt1.includes(id) || aktuellerVorschlag.fahrerA_id === id)
                            )
                            .map(id => <option key={id} value={id}>{getDriverLabel(id)}</option>)}
                    </select>
                </div>
            </div>
            <button className="btn btn-success mt-2" disabled={aktuelleAnwesenheit.size <= 1} onClick={() => fahrtSpeichern(datum, aktuelleAnwesenheit, aktuellerVorschlag)}>Speichern</button>
        </div>
    );
}



