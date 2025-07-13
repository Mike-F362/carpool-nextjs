"use client";

import Head from 'next/head';
import React, {useEffect, useRef, useState} from 'react';
import {supabase} from '@/lib/supabaseClient';
import {User as SupabaseUser} from "@supabase/auth-js";
import NeuerTag from "@/components/new_day";
import Tour from "@/interfaces/tour";
import Fahrtentabelle from "@/components/tour_table";
import Driver from "@/interfaces/driver";
import AuthModal from "@/components/auth_modal";
import FahrerVorschlag from "@/interfaces/driver_suggestion";
import Header from "@/components/header";

export default function Home() {
    const [tours, setTours] = useState<Array<Tour>>([]);
    const [currentDate, setCurrentDate] = useState<Date>();
    const [maxDate, setMaxDate] = useState<Date>();

    const [newDayActive, setNewDayActive] = useState(false);

    const [pageSize, setPageSize] = useState(20);
    const [visibleRows, setVisibleRows] = useState(pageSize);

    const tableContainerRef = useRef(null);

    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [driversSp, setDriversSp] = useState<number[]>([]);
    const [driversIm, setDriversIm] = useState<number[]>([]);

    const [session, setSession] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [showModal, setShowModal] = useState(false);

    const [allQuotesSp, setAllQuotesSp] = useState(new Map<string, Map<number, number>>);
    const [allQuotesIm, setAllQuotesIm] = useState(new Map<number, Map<string, Map<number, number>>>);

    const [loadingOuotes, setLoadingOuotes] = useState(true);
    const [loadingTours, setLoadingTours] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(async ({data}) => {
            setSession(data.session);
            supabase.auth.getUser().then(value => {
                const usr = value.data?.user;
                setUser(usr);
                setIsAdmin(usr?.user_metadata?.role === "admin");
            });
        });
        const {
            data: {subscription},
        } = supabase.auth.onAuthStateChange((_event, sess) => {
            setSession(sess);
            supabase.auth.getUser().then(value => {
                const usr = value.data?.user;
                setUser(usr);
                setIsAdmin(usr?.user_metadata?.role === "admin");

                loadDriverQuotes(usr);
                loadTours(usr);
                ladeFahrer(usr);
            });
        });

        return () => subscription.unsubscribe()
    }, []);

    async function ladeFahrer(user: SupabaseUser) {
        try {
            if (user) {
                const res = await fetch("/api/fahrer/list", {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${session?.access_token}`,
                    },
                });

                if (!res.ok) {
                    console.error("Fehler beim Abrufen der Fahrerdaten");
                    return;
                }

                const data = await res.json();

                const driver: Driver[] = data.map((e: { id: number; name: string; label: string; startpunkt: number; }) => ({
                    id: e.id,
                    name: e.name,
                    label: e.label,
                    startpunkt: e.startpunkt
                }));

                const sp1 = driver.filter(fahrer => fahrer.startpunkt === 1).map(fahrer => fahrer.id);
                const zw = driver.filter(fahrer => fahrer.startpunkt === 2).map(fahrer => fahrer.id);

                setDriversSp(sp1)
                setDriversIm(sp1.concat(zw));
                setDrivers(driver);
            } else {
                setDriversSp([])
                setDriversIm([]);
                setDrivers([]);
            }
        } catch (error) {
            console.error("Netzwerkfehler:", error);
        }
    }

    async function loadTours(user: SupabaseUser) {
        setLoadingTours(true);
        try {
            if (user) {
                const res = await fetch("/api/tours/list", {
                    method: "GET",
                    credentials: "include",
                    headers: {"Content-Type": "application/json"},
                });

                if (!res.ok) {
                    console.error("Fehler beim Abrufen der Fahrten");
                    return;
                }

                const data = await res.json();

                const tours = data.tours.map((row: { id: number; datum: string; fahrerA_id: number; fahrerB_id: number; anwesend_ids: number[]; }) => ({
                    id: row.id,
                    datum: row.datum,
                    fahrerA_id: row.fahrerA_id,
                    fahrerB_id: row.fahrerB_id,
                    anwesend_ids: row.anwesend_ids,
                }));

                const currentMaxDate = data.maxDate ? new Date(data.maxDate) : null;

                setMaxDate(currentMaxDate);
                setTours(tours);
            } else {
                setMaxDate(null);
                setTours([]);
            }
        } catch (error) {
            console.error("Netzwerkfehler:", error);
        }
        setLoadingTours(false);
    }

    async function loadDriverQuotesSp(user: SupabaseUser): Promise<Map<number, number>[]> {
        try {
            if (user) {
                const res = await fetch("/api/fahrer/quotes_sp", {
                    method: "POST",
                    credentials: "include",
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

                console.debug("QuoteSp:", allQuotes);

                setAllQuotesSp(allQuotes);
            } else {
                setAllQuotesSp(new Map<string, Map<number, number>>());
            }
        } catch (error) {
            console.error("Netzwerkfehler:", error);
        }
    }

    async function loadDriverQuotesIm(user: SupabaseUser): Promise<Map<number, number>[]> {
        try {
            if (user) {
                const res = await fetch("/api/fahrer/quotes_zw", {
                    method: "POST",
                    credentials: "include",
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

                console.debug("QuoteSp:", allQuotes);

                setAllQuotesIm(allQuotes);
            } else {
                setAllQuotesIm(new Map<number, Map<string, Map<number, number>>>());
            }
        } catch (error) {
            console.error("Netzwerkfehler:", error);
        }
    }

    const loadDriverQuotes = async (user: SupabaseUser) => {
        console.log("Initializing driver quotes...");

        setLoadingOuotes(true);

        await Promise.all([loadDriverQuotesSp(user), loadDriverQuotesIm(user)]);

        setLoadingOuotes(false);

        console.log("Initialized  driver quotes.");
    };

    const newTour = () => {
        const heute = new Date();
        const lastDate = maxDate;

        let tag = lastDate && lastDate > heute ? new Date(lastDate) : new Date(heute);

        do {
            tag.setDate(tag.getDate() + 1);
        } while (tag.getDay() === 0 || tag.getDay() === 6); // Sa+So überspringen

        setCurrentDate(tag);
        setNewDayActive(true);
    };

    const saveTour = async (datum: Date, aktuelleAnwesenheit: Set<number>, aktuellerVorschlag: FahrerVorschlag) => {
        const anwesend_ids = Array.from(aktuelleAnwesenheit);
        const fahrt: Tour = {
            datum,
            anwesend_ids,
            ...(aktuellerVorschlag),
        };

        await supabase.from("fahrten").insert(fahrt);

        setNewDayActive(false);

        // noinspection ES6MissingAwait
        loadTours(user);

        // noinspection ES6MissingAwait
        loadDriverQuotes(user);

        setTimeout(() => {
            tableContainerRef.current?.scrollTo({top: 0, behavior: 'smooth'});
        }, 100);

    };

    const removeTour = async (id: number) => {
        if (!confirm("Diese Tour wirklich löschen?")) return;
        await supabase.from("fahrten").delete().eq("id", id);
        await loadTours(user);
    };

    const resetTours = async () => {
        if (!confirm("Wirklich ALLE Touren löschen?")) return;

        localStorage.removeItem("fahrtverteilung");

        await supabase.from("fahrten").delete().gt("datum", new Date(0).toISOString());

        await Promise.all([loadTours(user), loadDriverQuotes(user)]);
    };

    const handleScroll = () => {
        if (!tableContainerRef.current) return;
        const {scrollTop, scrollHeight, clientHeight} = tableContainerRef.current;
        if (scrollTop + clientHeight >= scrollHeight - 10) {
            setVisibleRows((prev) => Math.min(prev + 20, tours.length));
        }
    }
    return (
        <div className="d-flex flex-column vh-100">
            <Head>
                <title>Fahrgemeinschaftsplaner</title>
            </Head>

            <div className="p-2 border-bottom bg-light">
                {session ? (
                    <>
                        <Header
                            user={user}
                            isAdmin={isAdmin}
                            reset={resetTours}
                        /></>
                ) : (
                    <button className="btn btn-sm btn-outline-primary" onClick={() => setShowModal(true)}>
                        Anmelden
                    </button>
                )}
            </div>

            {showModal && <AuthModal onClose={() => setShowModal(false)}/>}

            {session ? (
                <main className="d-flex flex-column">

                    <div style={{height: '1rem'}}></div>

                    <div className="d-flex gap-2 mb-3">
                        <button
                            className="btn btn-primary mb-3"
                            onClick={newDayActive ? () => setNewDayActive(false) : newTour}
                        >
                            {newDayActive ? "Abbrechen" : "Neuer Tag"}
                        </button>
                        {
                            <div className="input-group mb-3" style={{width: '200px'}} hidden={!isAdmin}>
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

                    <div className="flex-grow-1">
                        {newDayActive && (
                            <NeuerTag
                                currentDate={currentDate}
                                tours={tours}
                                drivers={drivers}
                                loadTours={loadTours}
                                setTours={setTours}
                                setCurrentDate={setCurrentDate}
                                setNewDayActive={setNewDayActive}
                                driversSp={driversSp}
                                tableContainerRef={tableContainerRef}
                                driversIm={driversIm}
                                saveTour={saveTour}
                                loadDriverQuotes={loadDriverQuotes}
                                allQuotesSp={allQuotesSp}
                                allQuotesIm={allQuotesIm}
                                loading={loadingOuotes}
                                isAdmin={isAdmin}
                                user={user}
                            />
                        )}

                        <Fahrtentabelle
                            loading={loadingTours}
                            daten={tours}
                            fahrerListe={drivers}
                            driversSp={driversSp}
                            driversIm={driversIm}
                            pageSize={pageSize}
                            visibleRows={visibleRows}
                            entferneFahrt={removeTour}
                            tableContainerRef={tableContainerRef}
                            handleScroll={handleScroll}
                        />

                    </div>

                </main>

            ) : (
                <div className="container text-center mt-5 text-muted">Bitte anmelden, um die App zu verwenden.</div>
            )}
        </div>
    );
}
