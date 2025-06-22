"use client";

import {supabase} from "@/lib/supabaseClient";
import React, {RefObject, useState} from "react";
import Tour from "@/interfaces/tour";
import Driver from "@/components/driver";

type Props = {
    anwesenheiten: Array<Set<string>>,
    daten: Tour[],
    fahrerListe: Driver[],
    setDaten: (d: any[]) => void,
    setNeuerTagAktiv: (v: boolean) => void,
    mitglieder: Driver[],
    setAnwesenheiten: (liste: Set<string>[]) => void,
    startpunkt1: string[],
    tableContainerRef: React.RefObject<HTMLDivElement>,
    zwischenstopp: string[],
    fahrtSpeichern: (datum: Date, aktuelleAnwesenheit: Set<string>, aktuellerVorschlag: { fahrerA: string; fahrerB: string }) => void,
    datum: Date,
    simuliereFahrt: (anwesend: Set<string>, daten, anwesenheiten) => { fahrerA: string; fahrerB: string },
    setDatum: (value: (((prevState: Date) => Date) | Date)) => void
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
                                     simuliereFahrt,
                                     setDatum
                                 }: Props) {
    const [aktuellerVorschlag, setAktuellerVorschlag] = useState({fahrerA: "", fahrerB: ""});
    const [aktuelleAnwesenheit, setAktuelleAnwesenheit] = useState(new Set<string>());

    const toggleAnwesenheit = (name) => {
        const kopie = new Set<string>(aktuelleAnwesenheit);
        if (kopie.has(name)) kopie.delete(name);
        else kopie.add(name);
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



