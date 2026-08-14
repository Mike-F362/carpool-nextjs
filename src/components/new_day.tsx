"use client";

import type React from "react";
import { useEffect, useState } from "react";
import type Tour from "@/interfaces/tour";
import type Driver from "@/interfaces/driver";
import type DriverSuggestion from "@/interfaces/driver_suggestion";
import { supabase } from "@/lib/supabaseClient";
import type { User as SupabaseUser } from "@supabase/auth-js";

type Props = {
    tours: Tour[];
    setTours: (d: any[]) => void;
    setNewDayActive: (v: boolean) => void;
    drivers: Driver[];
    driversSp: number[];
    tableContainerRef: React.RefObject<HTMLDivElement>;
    driversIm: number[];
    saveTour: (datum: Date, aktuelleAnwesenheit: Set<number>, aktuellerVorschlag: DriverSuggestion) => void;
    currentDate: Date;
    setCurrentDate: (value: ((prevState: Date) => Date) | Date) => void;
    loadTours: (user: SupabaseUser) => Promise<void>;
    allQuotesSp: Map<any, any>;
    allQuotesIm: Map<any, any>;
    loading: boolean;
    loadDriverQuotes: (user: SupabaseUser) => Promise<void>;
    isAdmin: boolean;
    user: SupabaseUser;
    lastTours: Map<any, any>;
};

export default function NeuerTag({
    tours,
    setTours,
    drivers,
    driversSp,
    tableContainerRef,
    saveTour,
    driversIm,
    currentDate,
    setCurrentDate,
    loadTours,
    allQuotesSp,
    allQuotesIm,
    loading,
    loadDriverQuotes,
    isAdmin,
    user,
    lastTours,
}: Props) {
    const [currentDriverSuggestion, setCurrentDriverSuggestion] = useState<DriverSuggestion>({
        fahrerA_id: 0,
        fahrerB_id: 0,
    });
    const [currentAttendance, setCurrentAttendance] = useState(new Set<number>());
    const [quotesZw, setQuotesZw] = useState(new Map<number, number>());
    const [quotesSp, setQuotesSp] = useState(new Map<number, number>());

    useEffect(() => {
        const init = async () => {
            if (tours && tours.length) {
                const letzteAnwesenheit = new Set(tours[tours.length - 1].anwesend_ids);

                setCurrentAttendance(new Set(letzteAnwesenheit));

                if (letzteAnwesenheit.size > 1) {
                    setCurrentDriverSuggestion(await berechneFahrerVorschlag(letzteAnwesenheit));
                } else {
                    setCurrentDriverSuggestion({ fahrerA_id: 0, fahrerB_id: 0 });
                }
            }
        };

        init().then(() => console.debug("New Day component initialized. Is loading:", loading));
    }, [loading]);

    const simulate = async () => {
        const aktuelleAnwesenheit = new Set<number>(drivers.map((m) => m.id));
        const aktuellerVorschlag = await berechneFahrerVorschlag(aktuelleAnwesenheit);

        const datum = tours
            .map((d) => d.datum)
            .reduce((prev, curr) => {
                return prev > curr ? prev : curr;
            }, new Date());

        const simDatum = new Date(datum);
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
            fahrerB_id: fahrer.fahrerB_id,
        };

        await supabase.from("fahrten").insert(fahrt);

        setCurrentDriverSuggestion(aktuellerVorschlag);
        setCurrentDate(simDatum);
        setTours([fahrt, ...tours]);
        setCurrentAttendance(aktuelleAnwesenheit);

        await Promise.all([loadTours(user), loadDriverQuotes(user)]);

        setTimeout(() => {
            tableContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        }, 100);
    };

    function nextDriver(anwesend: number[], quotes: Map<number, number>) {
        anwesend.sort((a, b) => {
            let res = (quotes.get(a) | 0) - (quotes.get(b) | 0);
            if (!res) {
                const lastTourA = lastTours.get(a) || 0;
                const lastTourB = lastTours.get(b) || 0;

                res = lastTourA - lastTourB;
            }
            return res;
        });

        const fahrerB_id = anwesend[0];
        const fahrerB = drivers.find((fahrer) => Number(fahrer.id) === Number(fahrerB_id));
        const fahrerB_text = fahrerB?.label || "?";
        return { fahrer_id: fahrerB_id, fahrer_text: fahrerB_text };
    }

    async function berechneFahrerVorschlag(anwesend: Set<number>): Promise<DriverSuggestion> {
        const fahrerA_id = await berechneFahrerVorschlagSp(anwesend);
        const fahrerB_id = await berechneFahrerVorschlagZw(fahrerA_id, anwesend);

        return {
            fahrerA_id,
            fahrerB_id,
        };
    }

    async function berechneFahrerVorschlagSp(anwesend: Set<number>): Promise<number> {
        const anwesendSp = Array.from(anwesend).filter((n) => driversSp.includes(n));

        let quotesSpKey = "";
        if (anwesendSp.length > 1) {
            quotesSpKey = Array.from(anwesendSp)
                .sort((a, b) => a - b)
                .join("-");
        }

        let quoteSp = allQuotesSp.get(quotesSpKey) || new Map();
        if (!quoteSp.size) {
            // check partial combinations match: f. ex. one tour was 4,5,11 - 11 was driver, new tour 4,11 -> 4 is driver
            // Erst Array.from, dann filtern: Iterator-Helfer wie
            // keys().filter() gibt es erst ab Chrome 122 / Safari 18.4.
            const partialMatchingQuotes = Array.from(allQuotesSp.keys()).filter((key) => {
                const ids: [string] = key.split("-");
                return anwesendSp.every((id) => ids.includes(id.toString()));
            });

            if (partialMatchingQuotes.length > 1) {
                // todo: handle multiple partialMatchingQuotes (possible for drivers > 3)
                console.warn("Found more than one partial quotes match", partialMatchingQuotes);
            }

            const partialQuoteSpKey = partialMatchingQuotes.pop();

            quoteSp = allQuotesSp.get(partialQuoteSpKey) || new Map();
        }
        setQuotesSp(quoteSp);

        const { fahrer_id: fahrerA_id, fahrer_text: fahrerA_text } = nextDriver(anwesendSp, quoteSp);

        console.log(`Fahrer A ${fahrerA_text} quote`, quoteSp);

        return fahrerA_id;
    }

    async function berechneFahrerVorschlagZw(fahrerA_id: number, anwesend: Set<number>): Promise<number> {
        const anwesendZw = Array.from(anwesend).filter((n) => driversIm.includes(n) && !driversSp.includes(n));

        // const quoteZw = await ladeFahrerQuoteZw(fahrerA_id, anwesendZw);
        const driverQuotesZw = allQuotesIm.get(fahrerA_id) || new Map();
        const quotesZwKey = Array.from(anwesendZw)
            .sort((a, b) => a - b)
            .join("-");
        const quoteZw = driverQuotesZw.get(quotesZwKey) || new Map();

        // TODO test partial combinations if quoteZw.size == 0
        setQuotesZw(quoteZw);

        anwesendZw.push(fahrerA_id);
        const { fahrer_id: fahrerB_id, fahrer_text: fahrerB_text } = nextDriver(anwesendZw, quoteZw);

        console.log(`Fahrer B ${fahrerB_text} quote`, quoteZw);

        return fahrerB_id;
    }

    const toggleAnwesenheit = async (id: number) => {
        const kopie = new Set<number>(currentAttendance);
        if (kopie.has(id)) kopie.delete(id);
        else kopie.add(id);
        setCurrentAttendance(kopie);

        if (kopie.size > 1) {
            setCurrentDriverSuggestion(await berechneFahrerVorschlag(kopie));
        } else {
            setCurrentDriverSuggestion({ fahrerA_id: 0, fahrerB_id: 0 });
        }
    };

    function getDriverLabel(id: number) {
        return drivers.find((driver) => driver.id === id).label;
    }

    function getDriverQuoteSp(driver: Driver) {
        let res = "";

        const currentAttendanceSp = Array.from(currentAttendance).filter((n) => driversSp.includes(n));

        if (quotesSp && currentAttendanceSp.length > 1 && currentAttendanceSp.includes(driver.id)) {
            const quoteSp = driver.startpunkt === 1 ? quotesSp.get(driver.id) | 0 : "-";
            res += String(quoteSp).padStart(4, " ");
            res += " x";
        }

        return res;
    }

    function getDriverQuoteZw(driver: Driver) {
        let res = "";

        if (currentAttendance.size > 1 && currentAttendance.has(driver.id)) {
            const quoteZw =
                driver.startpunkt === 2 || driver.id === currentDriverSuggestion.fahrerA_id
                    ? quotesZw.get(driver.id) | 0
                    : "-";
            res += String(quoteZw).padStart(4, " ");
            res += " x";
        }

        return res;
    }

    function isNextDriverSp(driver: Driver) {
        return currentDriverSuggestion.fahrerA_id === driver.id;
    }

    function isNextDriverIm(driver: Driver) {
        // Set.difference / Set.intersection gibt es erst ab Chrome 122 /
        // Safari 17.4 / Firefox 127 - auf aelteren Geraeten wirft das einen
        // TypeError. Gleiche Semantik, nur von Hand.
        const spIds = new Set(driversSp);
        const nurZw = driversIm.filter((id) => !spIds.has(id));

        const trifftZu = nurZw.some((id) => currentAttendance.has(id));

        return trifftZu && currentDriverSuggestion.fahrerB_id === driver.id;
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
        const vorschlag = await berechneFahrerVorschlag(currentAttendance);
        setCurrentDriverSuggestion(vorschlag);
    }

    return (
        <div className="card p-3 mb-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
                {isAdmin && (
                    <button type="button" className="btn btn-info mb-3" onClick={simulate}>
                        Simulation
                    </button>
                )}
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={resetForm}>
                    ♻️ Zurücksetzen
                </button>
            </div>

            <div className="mb-3">
                <label htmlFor="datum" className="form-label">
                    <strong>Datum der Fahrt:</strong>
                </label>
                <input
                    type="date"
                    className="form-control"
                    id="datum"
                    value={currentDate.toISOString().split("T")[0]}
                    onChange={(e) => setCurrentDate(new Date(e.target.value || ""))}
                />
            </div>
            <h5>Wer ist da?</h5>
            {drivers.map((driver) => (
                <div className={"list-group-item d-flex justify-content-between align-items-center"} key={driver.id}>
                    <div className="d-flex align-items-center">
                        <input
                            className="form-check-input me-2"
                            type="checkbox"
                            id={driver.name}
                            checked={currentAttendance.has(driver.id)}
                            onChange={() => toggleAnwesenheit(driver.id)}
                        />
                    </div>
                    <div className="d-flex align-items-center justify-content-between w-100">
                        <span>{driver.label}</span>
                        <span style={{ width: "6rem", textAlign: "right" }}>
                            <span style={{ minWidth: "5rem" }} className="d-flex justify-content-end gap-1">
                                {isNextDriverSp(driver) && <span className="badge bg-warning text-dark">🚗</span>}
                                {isNextDriverIm(driver) && <span className="badge bg-primary">🚗</span>}
                            </span>
                        </span>
                    </div>
                    <div className="d-flex gap-2" style={{ minWidth: "5rem", justifyContent: "flex-end" }}>
                        <span className="text-end text-muted" style={{ width: "3rem" }}>
                            {getDriverQuoteSp(driver)}
                        </span>
                        <span className="text-end text-muted" style={{ width: "3rem" }}>
                            {getDriverQuoteZw(driver)}
                        </span>
                    </div>
                </div>
            ))}
            <div className="mt-3">
                <div className="mb-2">
                    <label htmlFor="fahrerA" className="form-label">
                        <strong>Fahrer ab Startpunkt 1:</strong>
                    </label>
                    <select
                        className="form-select"
                        id="fahrerA"
                        value={currentDriverSuggestion.fahrerA_id}
                        onChange={async (e) => {
                            const fahrerA_id = parseInt(e.target.value) | 0;

                            let fahrerB_id = await berechneFahrerVorschlagZw(fahrerA_id, currentAttendance);

                            if (driversSp.includes(fahrerB_id) && currentDriverSuggestion.fahrerB_id === fahrerB_id) {
                                fahrerB_id = fahrerA_id;
                            }
                            setCurrentDriverSuggestion({ ...currentDriverSuggestion, fahrerA_id, fahrerB_id });
                        }}
                    >
                        <option value="">Wählen...</option>
                        {Array.from(currentAttendance)
                            .filter((id) => driversSp.includes(id))
                            .map((id) => (
                                <option key={id} value={id}>
                                    {getDriverLabel(id)}
                                </option>
                            ))}
                    </select>
                </div>
                <div className="mb-2">
                    <label htmlFor="fahrerB" className="form-label">
                        <strong>Fahrer ab Zwischenstopp:</strong>
                    </label>
                    <select
                        className="form-select"
                        id="fahrerB"
                        value={currentDriverSuggestion.fahrerB_id}
                        onChange={(e) =>
                            setCurrentDriverSuggestion({
                                ...currentDriverSuggestion,
                                fahrerB_id: parseInt(e.target.value) | 0,
                            })
                        }
                    >
                        <option value="">Wählen...</option>
                        {Array.from(currentAttendance)
                            .filter(
                                (id) =>
                                    driversIm.includes(id) &&
                                    (!driversSp.includes(id) || currentDriverSuggestion.fahrerA_id === id),
                            )
                            .map((id) => (
                                <option key={id} value={id}>
                                    {getDriverLabel(id)}
                                </option>
                            ))}
                    </select>
                </div>
            </div>
            <button
                type="button"
                className="btn btn-success mt-2"
                disabled={currentAttendance.size <= 1}
                onClick={() => saveTour(currentDate, currentAttendance, currentDriverSuggestion)}
            >
                Speichern
            </button>
        </div>
    );
}
