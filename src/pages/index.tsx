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

const eqSet = (xs: Set<string>, ys: Set<string>) =>
    xs.size === ys.size &&
    [...xs].every((x) => ys.has(x));

export default function Home() {
    const [anwesenheiten, setAnwesenheiten] = useState<Array<Set<string>>>([]);
    const [daten, setDaten] = useState<Array<Tour>>([]);
    const [datum, setDatum] = useState<Date>();

    const [log, setLog] = useState([]);
    const [fahrerVerwaltungAktiv, setFahrerVerwaltungAktiv] = useState(false);
    const [neuerTagAktiv, setNeuerTagAktiv] = useState(false);

    const [pageSize, setPageSize] = useState(20);
    const [visibleRows, setVisibleRows] = useState(pageSize);

    const tableContainerRef = useRef(null);

    const [fahrerListe, setFahrerListe] = useState<Driver[]>([]);
    const [mitglieder, setMitglieder] = useState<Driver[]>([]);
    const [startpunkt1, setStartpunkt1] = useState<string[]>([]);
    const [zwischenstopp, setZwischenstopp] = useState<string[]>([]);

    const [geöffneteZeilen, setGeöffneteZeilen] = useState<number[]>([]);

    const [session, setSession] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [zeigeModal, setZeigeModal] = useState(false);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showInviteAdmin, setShowInviteAdmin] = useState(false);

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

    function berechneFahrerQuote(anwesend: Set<string>, daten: [Tour], anwesenheiten: [Set<string>]): Map<string, number> {
        const quotes = new Map<string, number>();
        const zwischenstoppSet = new Set(mitglieder.filter(mitglied => mitglied.startpunkt === 2).map(mitglied => mitglied.name));

        anwesenheiten.forEach((anwesenheit, index) => {
            anwesenheit = anwesenheit.difference(zwischenstoppSet);

            if (eqSet(anwesenheit, anwesend)) {
                const fahrt = daten[index];

                const fahrtenA = quotes.get(fahrt.fahrerA) | 0;
                quotes.set(fahrt.fahrerA, fahrtenA + 1);
            }
        });

        return quotes;

        /* quotes for all
        daten.forEach((fahrt: { fahrerA: string; fahrerB: string; }, index: number) => {
          const anwesende = anwesenheiten[index];
          const key = Array.from(anwesende).join('-');
          if (!quotes.has(key)) {
            quotes.set(key, new Map<string, number>());
          }

          const quoteA = quotes.get(key);
          const fahrtenA = quoteA.get(fahrt.fahrerA) | 0;
          quoteA.set(fahrt.fahrerA, fahrtenA + 1);

          const quoteB = quotes.get(key);
          const fahrtenB = quoteB.get(fahrt.fahrerB) | 0;
          quoteB.set(fahrt.fahrerB, fahrtenB + 1);
        });
        */

        /*
        const quote = {};
        mitglieder.forEach(name => {
          let anzahlAnwesend = 0;
          let anzahlFahrten = 0;
          daten.forEach((fahrt: { fahrerA: string; fahrerB: string; }, index: string | number) => {
            if (anwesenheiten[index]?.has(name)) anzahlAnwesend++;
            if (fahrt.fahrerA === name || fahrt.fahrerB === name) anzahlFahrten++;
          });
          quote[name] = anzahlAnwesend ? anzahlFahrten / anzahlAnwesend : 0;
        });
        return quote;
        */
    }

    function berechneFahrerQuote2(fahrerA: string, anwesend: Set<string>, daten: [{ fahrerA: string; fahrerB: string; }], anwesenheiten: [Set<string>]): Map<string, number> {
        const quotes = new Map<string, number>();

        daten.forEach((fahrt, index) => {
            if (fahrt.fahrerA === fahrerA) {
                const anwesenheit = anwesenheiten[index];

                // TODO: check anwesend set
                const fahrtenB = quotes.get(fahrt.fahrerB) | 0;
                quotes.set(fahrt.fahrerB, fahrtenB + 1);
            }
        })

        return quotes;

        /* quotes for all
        daten.forEach((fahrt: { fahrerA: string; fahrerB: string; }, index: number) => {
          const anwesende = anwesenheiten[index];
          const key = Array.from(anwesende).join('-');
          if (!quotes.has(key)) {
            quotes.set(key, new Map<string, number>());
          }

          const quoteA = quotes.get(key);
          const fahrtenA = quoteA.get(fahrt.fahrerA) | 0;
          quoteA.set(fahrt.fahrerA, fahrtenA + 1);

          const quoteB = quotes.get(key);
          const fahrtenB = quoteB.get(fahrt.fahrerB) | 0;
          quoteB.set(fahrt.fahrerB, fahrtenB + 1);
        });
        */

        /*
        const quote = {};
        mitglieder.forEach(name => {
          let anzahlAnwesend = 0;
          let anzahlFahrten = 0;
          daten.forEach((fahrt: { fahrerA: string; fahrerB: string; }, index: string | number) => {
            if (anwesenheiten[index]?.has(name)) anzahlAnwesend++;
            if (fahrt.fahrerA === name || fahrt.fahrerB === name) anzahlFahrten++;
          });
          quote[name] = anzahlAnwesend ? anzahlFahrten / anzahlAnwesend : 0;
        });
        return quote;
        */
    }

    function simuliereFahrt(anwesend: Set<string>, daten, anwesenheiten) {
        const anwesend1 = Array.from(anwesend)
            .filter(n => startpunkt1.includes(n));
        let quote = berechneFahrerQuote(new Set(anwesend1), daten, anwesenheiten);

        anwesend1.sort((a, b) => {
            return ((quote.get(a) | 0) - (quote.get(b) | 0)) || a.localeCompare(b);
        });

        const fahrerA = anwesend1[0] || "?";

        console.log(`Fahrer A ${fahrerA} quote`, quote);

        const anwesend2 = Array.from(anwesend)
            .filter(n => zwischenstopp.includes(n) && !startpunkt1.includes(n));

        quote = berechneFahrerQuote2(fahrerA, new Set(anwesend2), daten, anwesenheiten);

        anwesend2.push(fahrerA);
        anwesend2.sort((a, b) => {
            return ((quote.get(a) | 0) - (quote.get(b) | 0)) || a.localeCompare(b);
        });

        const fahrerB = anwesend2[0] || "?";

        console.log(`Fahrer B ${fahrerB} quote`, quote);

        return {
            fahrerA,
            fahrerB
        };
    }

    async function ladeFahrten() {
        const {data} = await supabase.from("fahrten").select("*").order("datum", {ascending: false});
        if (data) {
            setDaten(data.map(d => ({
                id: d.id,
                datum: new Date(d.datum),
                fahrerA: d.fahrer_a, fahrerB: d.fahrer_b
            })));
            setAnwesenheiten(data.map(d => new Set(d.anwesenheit)));
        }
    }

    useEffect(() => {
        ladeFahrten();
    }, []);

    useEffect(() => {
        const ladeFahrer = async () => {
            const {data} = await supabase.from("fahrer").select("*");
            if (data) {
                const fahrer: Driver[] = data.map(e => {
                    return e as Driver;
                    // {
                    //     id: e.id,
                    //     name: e.name,
                    //     startpunkt: e.startpunkt
                    // }
                });
                const sp1 = fahrer.filter(fahrer => fahrer.startpunkt === 1).map(fahrer => fahrer.name);
                setStartpunkt1(sp1)
                const zw = fahrer.filter(fahrer => fahrer.startpunkt === 2).map(fahrer => fahrer.name);
                setZwischenstopp(sp1.concat(zw));
                setFahrerListe(fahrer);
                setMitglieder(fahrer);
            }
        };
        ladeFahrer();
    }, []);

    const neuerTagStarten = () => {
        const heute = new Date();
        let tag = new Date(heute);
        do {
            tag.setDate(tag.getDate() + 1);
        } while (tag.getDay() === 0 || tag.getDay() === 6); // Sa+So überspringen

        setDatum(tag);
        setNeuerTagAktiv(true);
    };

    const fahrtSpeichern = async (datum, aktuelleAnwesenheit, aktuellerVorschlag) => {
        const anwesend = Array.from(aktuelleAnwesenheit);
        const fahrer = aktuellerVorschlag;
        const fahrt: Tour = {datum, ...fahrer};

        await supabase.from("fahrten").insert({
            datum,
            anwesenheit: anwesend,
            fahrer_a: fahrer.fahrerA,
            fahrer_b: fahrer.fahrerB
        });

        setNeuerTagAktiv(false);

        ladeFahrten();

        setTimeout(() => {
            tableContainerRef.current?.scrollTo({top: 0, behavior: 'smooth'});
        }, 100);

    };

    const simulate = async () => {

        const aktuelleAnwesenheit = new Set<string>(mitglieder.map(m => m.name));
        const aktuellerVorschlag = simuliereFahrt(aktuelleAnwesenheit, daten, anwesenheiten);

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
        const fahrt: Tour = {datum: simDatum, ...fahrer};

        await supabase.from("fahrten").insert({
            datum: simDatum,
            anwesenheit: anwesend,
            fahrer_a: fahrer.fahrerA,
            fahrer_b: fahrer.fahrerB
        });

        setDatum(simDatum);
        setDaten([fahrt, ...daten]);
        setAnwesenheiten([aktuelleAnwesenheit, ...anwesenheiten]);

        setTimeout(() => {
            tableContainerRef.current?.scrollTo({top: 0, behavior: 'smooth'});
        }, 100);
    }

    const handleScroll = () => {
        if (!tableContainerRef.current) return;
        const {scrollTop, scrollHeight, clientHeight} = tableContainerRef.current;
        if (scrollTop + clientHeight >= scrollHeight - 10) {
            setVisibleRows((prev) => Math.min(prev + 20, daten.length));
        }
    }

    const reset = async () => {
        if (!confirm("Wirklich ALLE Touren löschen?")) return;

        setDaten([]);
        setAnwesenheiten([]);
        setLog([]);
        localStorage.removeItem("fahrtverteilung");
        await supabase.from("fahrten").delete().gt("datum", new Date(0).toISOString());
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

    return (
        <div className="d-flex flex-column vh-100">
            <Head>
                <title>Fahrgemeinschaftsplaner</title>
                <link
                    href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"
                    rel="stylesheet"
                />
            </Head>
            <header className="p-2 ">
                <h1>Fahrgemeinschaftsplaner</h1>
                {/*    TODO: Version rechtsbündig*/}
            </header>

            <div className="p-2 border-bottom bg-light text-end">
                {session ? (
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => supabase.auth.signOut()}>
                        Abmelden
                    </button>
                ) : (
                    <button className="btn btn-sm btn-outline-primary" onClick={() => setZeigeModal(true)}>
                        Anmelden
                    </button>
                )}
            </div>

            {zeigeModal && <AuthModal onClose={() => setZeigeModal(false)}/>}

            {session ? (
                <main className="d-flex flex-column overflow-hidden ">

                    {isAdmin && (
                        <ul className="list-group">
                            <li className="list-group">
                                <button className="btn btn-outline-success btn-sm" onClick={() => setShowCreateModal(true)}>
                                    <Link href="/fahrer_admin" className="nav-link">Fahrer</Link>
                                </button>
                            </li>
                            <li className="list-group">
                                <button className="btn btn-outline-info btn-sm" onClick={() => setShowInviteAdmin(true)}>
                                    <Link href="/invite_admin" className="nav-link">Einladungen</Link>
                                </button>
                            </li>
                            <li className="list-group">
                                <button className="btn btn-outline-danger btn-sm" onClick={() => setShowCreateModal(true)}>
                                    <Link href="/user_admin" className="nav-link">Benutzer</Link>
                                </button>
                            </li>
                            <li className="list-group">
                                <button className="btn btn-outline-warning warning mb-3" onClick={reset}>Reset</button>
                            </li>
                        </ul>
                    )}

                    <div style={{height: '1rem'}}></div>

                    {/*<div className="p-2">*/}
                    <div className="d-flex gap-2 mb-3">
                        <button
                            className="btn btn-primary mb-3"
                            onClick={neuerTagAktiv ? () => setNeuerTagAktiv(false) : neuerTagStarten}
                        >
                            {neuerTagAktiv ? "Abbrechen" : "Neuer Tag"}
                        </button>
                        <button className="btn btn-info mb-3" onClick={simulate}>Simulation</button>
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
                                simuliereFahrt={simuliereFahrt}
                                setAnwesenheiten={setAnwesenheiten}
                                setDaten={setDaten}
                                setDatum={setDatum}
                                setNeuerTagAktiv={setNeuerTagAktiv}
                                startpunkt1={startpunkt1}
                                tableContainerRef={tableContainerRef}
                                zwischenstopp={zwischenstopp}
                                fahrtSpeichern={fahrtSpeichern}
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
