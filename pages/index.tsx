import Head from 'next/head';
import {useEffect, useState, useRef} from 'react';
import {supabase} from '../lib/supabaseClient';
import {tagsManifest} from "next/dist/server/lib/incremental-cache/tags-manifest.external";
// import styles from './index.module.css';
import Fahrerverwaltung, {Fahrer} from "../components/Fahrerverwaltung";


// const startpunkt1 = ["Anna", "Bernd", "Carla"];
// const zwischenstopp = startpunkt1.concat(["Dana", "Kurt"]);
// const mitglieder = Array.from(new Set([...startpunkt1, ...zwischenstopp]));

const eqSet = (xs: Set<string>, ys: Set<string>) =>
    xs.size === ys.size &&
    [...xs].every((x) => ys.has(x));

type Fahrt = { datum: Date, fahrerA: string; fahrerB: string; };

function berechneFahrerQuote(anwesend: Set<string>, daten: [Fahrt], anwesenheiten: [Set<string>]): Map<string, number> {
    const quotes = new Map<string, number>();

    anwesenheiten.forEach((anwesenheit, index) => {
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

export default function Home() {
    const [anwesenheiten, setAnwesenheiten] = useState<Array<Set<string>>>([]);
    const [daten, setDaten] = useState<Array<Fahrt>>([]);
    const [datum, setDatum] = useState<Date>();

    const [log, setLog] = useState([]);
    const [fahrerVerwaltungAktiv, setFahrerVerwaltungAktiv] = useState(false);
    const [neuerTagAktiv, setNeuerTagAktiv] = useState(false);
    const [aktuellerVorschlag, setAktuellerVorschlag] = useState({fahrerA: "", fahrerB: ""});
    const [aktuelleAnwesenheit, setAktuelleAnwesenheit] = useState(new Set<string>());

    const [pageSize, setPageSize] = useState(20);
    const [visibleRows, setVisibleRows] = useState(pageSize);

    const tableContainerRef = useRef(null);

    const [fahrerListe, setFahrerListe] = useState<Fahrer[]>([]);
    const [mitglieder, setMitglieder] = useState<Fahrer[]>([]);
    const [startpunkt1, setStartpunkt1] = useState<string[]>([]);
    const [zwischenstopp, setZwischenstopp] = useState<string[]>([]);

    function simuliereFahrt(anwesend: Set<string>, daten, anwesenheiten) {
        let quote = berechneFahrerQuote(anwesend, daten, anwesenheiten);
        const anwesend1 = Array.from(anwesend)
            .filter(n => startpunkt1.includes(n))
            .sort((a, b) => {
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

    useEffect(() => {
        async function lade() {
            const {data} = await supabase.from("fahrten").select("*").order("datum", {ascending: false});
            if (data) {
                setDaten(data.map(d => ({
                    datum: new Date(d.datum),
                    fahrerA: d.fahrer_a, fahrerB: d.fahrer_b
                })));
                setAnwesenheiten(data.map(d => new Set(d.anwesenheit)));
            }
        }

        lade();
    }, []);

    useEffect(() => {
        const ladeFahrer = async () => {
            const { data } = await supabase.from("fahrer").select("*");
            if (data) {
                const fahrer: Fahrer[] = data.map(e => {return {
                    id: e.id,
                    name: e.name,
                    startpunkt: e.startpunkt
                }
                });
                const sp1 = fahrer.filter(fahrer => fahrer.startpunkt===1).map(fahrer => fahrer.name);
                setStartpunkt1(sp1)
                const zw = fahrer.filter(fahrer => fahrer.startpunkt===2).map(fahrer => fahrer.name);
                setZwischenstopp(sp1.concat(zw));
                setFahrerListe(fahrer);
                setMitglieder(fahrer);
            }
        };
        ladeFahrer();
    }, []);

    const toggleAnwesenheit = (name) => {
        const kopie = new Set<string>(aktuelleAnwesenheit);
        if (kopie.has(name)) kopie.delete(name);
        else kopie.add(name);
        setAktuelleAnwesenheit(kopie);
        setAktuellerVorschlag(simuliereFahrt(kopie, daten, anwesenheiten));
    };

    const neuerTagStarten = () => {
        const heute = new Date();
        let tag = new Date(heute);
        do {
            tag.setDate(tag.getDate() + 1);
        } while (tag.getDay() === 0 || tag.getDay() === 6); // Sa+So überspringen

        setDatum(tag);
        setNeuerTagAktiv(true);
        setAktuelleAnwesenheit(new Set());
        setAktuellerVorschlag({fahrerA: "", fahrerB: ""});
    };

    const fahrtSpeichern = async () => {
        const anwesend = Array.from(aktuelleAnwesenheit);
        const fahrer = aktuellerVorschlag;
        const fahrt: Fahrt = {datum, ...fahrer};

        await supabase.from("fahrten").insert({
            datum,
            anwesenheit: anwesend,
            fahrer_a: fahrer.fahrerA,
            fahrer_b: fahrer.fahrerB
        });

        setDaten([fahrt, ...daten]);
        setAnwesenheiten([aktuelleAnwesenheit, ...anwesenheiten]);
        setNeuerTagAktiv(false);

        setTimeout(() => {
            tableContainerRef.current?.scrollTo({top: 0, behavior: 'smooth'});
        }, 100);

    };

    const simulate = async () => {

        const aktuelleAnwesenheit = new Set<string>(mitglieder.map(m => m.name));
        const aktuellerVorschlag = simuliereFahrt(aktuelleAnwesenheit, daten, anwesenheiten);

        let datum = daten.map(d => d.datum).reduce((prev, curr, index, arr) => {
            return prev > curr ? prev : curr }, new Date());

        let simDatum = new Date(datum);
        do {
            simDatum.setDate(simDatum.getDate() + 1);
        } while (simDatum.getDay() === 0 || simDatum.getDay() === 6); // Sa+So überspringen

        // const tag = daten.length + 1;
        const anwesend = Array.from(aktuelleAnwesenheit);
        const fahrer = aktuellerVorschlag;
        const fahrt: Fahrt = {datum: simDatum, ...fahrer};

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
        setDaten([]);
        setAnwesenheiten([]);
        setLog([]);
        localStorage.removeItem("fahrtverteilung");
        await supabase.from("fahrten").delete().gt("datum", new Date(0).toISOString());
    };

    return (
        <div className="container py-4">
            <Head>
                <title>Carpool Planner</title>
                <link
                    href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"
                    rel="stylesheet"
                />
                <style>{`
          thead th {
            position: sticky;
            top: 0;
            background: white;
            z-index: 2;
          }
        `}</style>
            </Head>
            <h1 className="mb-3">Carpool Planner</h1>

            <div className="d-flex gap-2 mb-3">
                <button className="btn btn-primary" onClick={neuerTagStarten}>Neuer Tag</button>
                <button className="btn btn-outline-secondary" onClick={() => tableContainerRef.current?.scrollTo({top: 0, behavior: 'smooth'})}>⤴ Zur neuesten Fahrt</button>

                <button className="btn btn-success mb-3" onClick={() => setFahrerVerwaltungAktiv(true)}>Fahrerverwaltung</button>
                <button className="btn btn-warning mb-3" onClick={reset}>Reset</button>
                <button className="btn btn-info mb-3" onClick={simulate}>Simulation</button>
            </div>

            {fahrerVerwaltungAktiv && (
                <Fahrerverwaltung
                    fahrerListe={fahrerListe}
                    setFahrerListe={setFahrerListe}
                    setMitglieder={setMitglieder}
                />
            )}
{/*

            <div className="input-group" style={{width: '200px'}}>
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

*/}
            <div style={{height: '1rem'}}></div>

            {neuerTagAktiv && (
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
                    <button className="btn btn-success mt-2" onClick={fahrtSpeichern}>Speichern</button>
                </div>
            )}

            <div
                className="table-responsive mb-3"
                style={{maxHeight: "500px", overflowY: "auto"}}
                ref={tableContainerRef}
                onScroll={handleScroll}
            >
                <table className="table table-bordered table-sm">
                    <thead>
                    <tr>
                        <th>Tag</th>
                        {mitglieder.map(mitglied => <th key={mitglied.name}>{mitglied.name}</th>)}
                        <th>Fahrer</th>
                    </tr>
                    </thead>
                    <tbody>
                    {
                        // [...daten].slice(-visibleRows).map((f, i, arr) => (
                        [...daten].map((f, i, arr) => (
                        <tr key={i} className="">
                            <td>{f.datum.toLocaleDateString('de-DE', {weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric'})}</td>

                            {mitglieder.map(m => (
                                <td key={m.name} className={f.fahrerA === m.name ? "table-warning" : f.fahrerB === m.name ? "table-primary" : ""}>{anwesenheiten[daten.indexOf(f)]?.has(m.name) ? "✓" : ""}</td>
                            ))}
                            <td><strong>{f.fahrerA} → {f.fahrerB}</strong></td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
