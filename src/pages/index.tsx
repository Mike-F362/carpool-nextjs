"use client";

import Head from 'next/head';
import React, {useEffect, useRef, useState} from 'react';
import {supabase} from '@/lib/supabaseClient';
import {tagsManifest} from "next/dist/server/lib/incremental-cache/tags-manifest.external";
import styles from './index.module.css';
import Fahrerverwaltung from "@/components/Fahrerverwaltung";
import NeuerTag from "@/components/new_day";
import Tour from "@/interfaces/tour";
import Fahrtentabelle from "@/components/tour_table";
import Driver from "@/interfaces/driver";
import AuthModal from "@/components/auth_modal";
import UserCreateModal from "@/components/user_create_modal";
import Link from "next/link";
import FahrerVorschlag from "@/interfaces/driver_suggestion";
import Header from "@/components/header";
import AppVersion from "@/components/app_version";

const eqSet = (xs: Set<string>, ys: Set<string>) =>
    xs.size === ys.size &&
    [...xs].every((x) => ys.has(x));

export default function Home() {
    const [anwesenheiten, setAnwesenheiten] = useState<Array<Set<number>>>([]);
    const [daten, setDaten] = useState<Array<Tour>>([]);
    const [datum, setDatum] = useState<Date>();
    const [maxDate, setMaxDate] = useState<Date>();

    const [neuerTagAktiv, setNeuerTagAktiv] = useState(false);

    const [pageSize, setPageSize] = useState(20);
    const [visibleRows, setVisibleRows] = useState(pageSize);

    const tableContainerRef = useRef(null);

    const [fahrerListe, setFahrerListe] = useState<Driver[]>([]);
    const [mitglieder, setMitglieder] = useState<Driver[]>([]);
    const [startpunkt1, setStartpunkt1] = useState<number[]>([]);
    const [zwischenstopp, setZwischenstopp] = useState<number[]>([]);

    const [geöffneteZeilen, setGeöffneteZeilen] = useState<number[]>([]);

    const [session, setSession] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [zeigeModal, setZeigeModal] = useState(false);

    const [allQuotesSp, setAllQuotesSp] = useState(new Map<string, Map<number, number>>);
    const [allQuotesZw, setAllQuotesZw] = useState(new Map<number, Map<string, Map<number, number>>>);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(async ({data}) => {
            setSession(data.session);
            supabase.auth.getUser().then(value => {
                const usr = value.data?.user;
                setUser(usr);
                setIsAdmin(usr?.user_metadata?.role === "admin");
            });
        });
        supabase.auth.onAuthStateChange(async (_event, sess) => {
            setSession(sess);
            supabase.auth.getUser().then(value => {
                const usr = value.data?.user;
                setUser(usr);
                setIsAdmin(usr?.user_metadata?.role === "admin");
            });
        });
    }, []);

    useEffect(() => {
        initFahrerQuotes();
    }, []);

    useEffect(() => {
        ladeFahrten();
    }, []);

    useEffect(() => {
        const ladeFahrer = async () => {
            const {data} = await supabase.from("fahrer").select("*");
            if (data) {
                const fahrer: Driver[] = data.map(e => ({
                    id: e.id,
                    name: e.name,
                    label: e.label,
                    startpunkt: e.startpunkt
                }));
                const sp1 = fahrer.filter(fahrer => fahrer.startpunkt === 1).map(fahrer => fahrer.id);
                setStartpunkt1(sp1)
                const zw = fahrer.filter(fahrer => fahrer.startpunkt === 2).map(fahrer => fahrer.id);
                setZwischenstopp(sp1.concat(zw));
                setFahrerListe(fahrer);
                setMitglieder(fahrer);
            }
        };
        ladeFahrer();
    }, []);

    async function ladeFahrten() {
        try {
            const res = await fetch("/api/tours/list", {
                method: "GET",
                headers: {"Content-Type": "application/json"},
            });

            if (!res.ok) {
                console.error("Fehler beim Abrufen der Fahrten");
                return;
            }

            const data = await res.json();

            const tours = data.tours.map(row => ({
                id: row.id,
                datum: row.datum,
                fahrerA_id: row.fahrerA_id,
                fahrerB_id: row.fahrerB_id,
                anwesend_ids: row.anwesend_ids,
            }));

            const currentMaxDate = data.maxDate ? new Date(data.maxDate) : null;

            setMaxDate(currentMaxDate);
            setDaten(tours);
            setAnwesenheiten(tours.map(d => new Set(d.anwesend_ids)));

        } catch (error) {
            console.error("Netzwerkfehler:", error);
        }
    }

    async function ladeFahrerQuotesSp(): Promise<Map<number, number>[]> {
        try {
            const res = await fetch("/api/fahrer/quotes_sp", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
            });

            if (!res.ok) {
                console.error("Fehler beim Abrufen der Fahrerquote");
                return;
            }

            const quotes: Object = await res.json();
            const allQuotes = Object.keys(quotes).reduce((obj, item) => {
                const quoteMap: Map<number, number> = new Map(Object.entries(quotes[item]).map(([key, value]) => {
                    return [parseInt(key), value as number];
                }));

                obj.set(item, quoteMap);

                return obj
            }, new Map<string, Map<number, number>>());

            console.log("QuoteSp:", allQuotes);

            setAllQuotesSp(allQuotes);
        } catch (error) {
            console.error("Netzwerkfehler:", error);
        }
    }

    async function ladeFahrerQuotesZw(): Promise<Map<number, number>[]> {
        try {
            const res = await fetch("/api/fahrer/quotes_zw", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
            });

            if (!res.ok) {
                console.error("Fehler beim Abrufen der Fahrerquote");
                return;
            }

            const quotes: Object = await res.json();
            const allQuotes = Object.keys(quotes).reduce((obj, item) => {
                const quoteMap: Map<string, Map<number, number>> = new Map(Object.entries(quotes[item]).map(([key, value]) => {
                    const innerQuoteMap: Map<number, number> = new Map(Object.entries(value).map(([key, value]) => {
                        return [parseInt(key), value as number];
                    }));

                    return [key, innerQuoteMap];
                }));

                obj.set(parseInt(item), quoteMap);

                return obj
            }, new Map<number, Map<string, Map<number, number>>>());

            console.log("QuoteSp:", allQuotes);

            setAllQuotesZw(allQuotes);
        } catch (error) {
            console.error("Netzwerkfehler:", error);
        }
    }

    const initFahrerQuotes = async () => {
        console.log("Initializing fahrer quotes...");

        setLoading(true);

        // Beispiel: Daten laden, Vorschlag berechnen, etc.
        await Promise.all([ladeFahrerQuotesSp(), ladeFahrerQuotesZw()]);

        setLoading(false);

        console.log("Initialized  fahrer quotes.");
    };

    const neuerTagStarten = () => {
        const heute = new Date();
        const lastDate = maxDate;

        let tag = lastDate && lastDate > heute ? new Date(lastDate) : new Date(heute);

        do {
            tag.setDate(tag.getDate() + 1);
        } while (tag.getDay() === 0 || tag.getDay() === 6); // Sa+So überspringen

        setDatum(tag);
        setNeuerTagAktiv(true);
    };

    const fahrtSpeichern = async (datum: Date, aktuelleAnwesenheit: Set<number>, aktuellerVorschlag: FahrerVorschlag) => {
        const anwesend_ids = Array.from(aktuelleAnwesenheit);
        const driverSuggestion = aktuellerVorschlag;
        const fahrt: Tour = {
            datum,
            anwesend_ids,
            ...driverSuggestion,
        };

        await supabase.from("fahrten").insert(fahrt);

        setNeuerTagAktiv(false);

        ladeFahrten();

        initFahrerQuotes();

        setTimeout(() => {
            tableContainerRef.current?.scrollTo({top: 0, behavior: 'smooth'});
        }, 100);

    };

    const handleScroll = () => {
        if (!tableContainerRef.current) return;
        const {scrollTop, scrollHeight, clientHeight} = tableContainerRef.current;
        if (scrollTop + clientHeight >= scrollHeight - 10) {
            setVisibleRows((prev) => Math.min(prev + 20, daten.length));
        }
    }

    const reset = async () => {
        if (!confirm("Wirklich ALLE Touren löschen?")) return;

        localStorage.removeItem("fahrtverteilung");

        await supabase.from("fahrten").delete().gt("datum", new Date(0).toISOString());

        ladeFahrten();
        initFahrerQuotes();
    };

    const entferneFahrt = async (id: number) => {
        if (!confirm("Diese Tour wirklich löschen?")) return;
        await supabase.from("fahrten").delete().eq("id", id);
        ladeFahrten();
    };

    const zeileUmschalten = (index: number) => {
        setGeöffneteZeilen(prev =>
            prev.includes(index)
                ? prev.filter(i => i !== index)
                : [...prev, index]
        );
    };

    function isSameAnwesenheit(
        fahrtAnwesend: string[],
        selectedAnwesend: string[],
        zwischenIds: Set<string>
    ): boolean {
        const filter = (arr: string[]) => arr.filter(id => !zwischenIds.has(id)).sort();
        const a = filter(fahrtAnwesend);
        const b = filter(selectedAnwesend);
        return JSON.stringify(a) === JSON.stringify(b);
    }

    return (
        <div className="d-flex flex-column vh-100">
            <Head>
                <title>Fahrgemeinschaftsplaner</title>
                <link
                    href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"
                    rel="stylesheet"
                />
            </Head>

            <div className="p-2 border-bottom bg-light">
                {session ? (
                    <>
                        <Header
                            user={user}
                            isAdmin={isAdmin}
                            reset={reset}
                        /></>
                ) : (
                    <button className="btn btn-sm btn-outline-primary" onClick={() => setZeigeModal(true)}>
                        Anmelden
                    </button>
                )}
            </div>

            {zeigeModal && <AuthModal onClose={() => setZeigeModal(false)}/>}

            {session ? (
                <main className="d-flex flex-column overflow-hidden ">

                    <div style={{height: '1rem'}}></div>

                    {/*<div className="p-2">*/}
                    <div className="d-flex gap-2 mb-3">
                        <button
                            className="btn btn-primary mb-3"
                            onClick={neuerTagAktiv ? () => setNeuerTagAktiv(false) : neuerTagStarten}
                        >
                            {neuerTagAktiv ? "Abbrechen" : "Neuer Tag"}
                        </button>
                        {
                            <div className="input-group mb-3" style={{width: '200px'}}>
                                <label className="input-group-text" htmlFor="pageSize">Zeilen</label>
                                <select
                                    id="pageSize"
                                    className="form-select"
                                    value={pageSize}
                                    onChange={e => {
                                        const val = parseInt(e.target.value);
                                        setPageSize(val);
                                        setVisibleRows(val);
                                    }}
                                >
                                    {[10, 20, 40, 60, 100].map(size => (
                                        <option key={size} value={size}>{size}</option>
                                    ))}
                                </select>
                            </div>
                        }
                    </div>

                    {/*<div style={{height: '1rem'}}></div>*/}

                    <div className="flex-grow-1 overflow-auto">
                        {neuerTagAktiv && (
                            <NeuerTag
                                datum={datum}
                                anwesenheiten={anwesenheiten}
                                daten={daten}
                                fahrerListe={fahrerListe}
                                mitglieder={mitglieder}
                                ladeFahrten={ladeFahrten}
                                setAnwesenheiten={setAnwesenheiten}
                                setDaten={setDaten}
                                setDatum={setDatum}
                                setNeuerTagAktiv={setNeuerTagAktiv}
                                startpunkt1={startpunkt1}
                                tableContainerRef={tableContainerRef}
                                zwischenstopp={zwischenstopp}
                                fahrtSpeichern={fahrtSpeichern}
                                initFahrerQuotes={initFahrerQuotes}
                                allQuotesSp={allQuotesSp}
                                allQuotesZw={allQuotesZw}
                                loading={loading}
                                isAdmin={isAdmin}
                            />
                        )}

                        <Fahrtentabelle
                            daten={daten}
                            fahrerListe={fahrerListe}
                            anwesenheiten={anwesenheiten}
                            pageSize={pageSize}
                            visibleRows={visibleRows}
                            entferneFahrt={entferneFahrt}
                            tableContainerRef={tableContainerRef}
                            handleScroll={handleScroll}
                            geöffneteZeilen={geöffneteZeilen}
                            zeileUmschalten={zeileUmschalten}
                        />

                    </div>

                </main>

            ) : (
                <div className="container text-center mt-5 text-muted">Bitte anmelden, um die App zu verwenden.</div>
            )}
        </div>
    );
}
