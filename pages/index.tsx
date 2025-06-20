import Head from 'next/head';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import {tagsManifest} from "next/dist/server/lib/incremental-cache/tags-manifest.external";
// import styles from './index.module.css';

const startpunkt1 = ["Anna", "Bernd", "Carla"];
const zwischenstopp = startpunkt1.concat(["Dana", "Kurt"]);
const mitglieder = Array.from(new Set([...startpunkt1, ...zwischenstopp]));

const eqSet = (xs:Set<string>, ys: Set<string>) =>
    xs.size === ys.size &&
    [...xs].every((x) => ys.has(x));

function berechneFahrerQuote(anwesend:Set<string>, daten: [{ fahrerA: string; fahrerB: string; }], anwesenheiten: [Set<string>]): Map<string, number> {
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

function berechneFahrerQuote2(fahrerA: string, anwesend:Set<string>, daten: [{ fahrerA: string; fahrerB: string; }], anwesenheiten: [Set<string>]): Map<string, number> {
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

export default function Home() {
  const [anwesenheiten, setAnwesenheiten] = useState([]);
  const [daten, setDaten] = useState([]);
  const [datum, setDatum] = useState("");

  const [log, setLog] = useState([]);
  const [neuerTagAktiv, setNeuerTagAktiv] = useState(false);
  const [aktuellerVorschlag, setAktuellerVorschlag] = useState({ fahrerA: "", fahrerB: "" });
  const [aktuelleAnwesenheit, setAktuelleAnwesenheit] = useState(new Set<string>());
  const [visibleRows, setVisibleRows] = useState(20);
  const tableContainerRef = useRef(null);

  useEffect(() => {
    async function lade() {
      const { data } = await supabase.from("fahrten").select("*").order("tag", { ascending: true });
      if (data) {
        setDaten(data.map(d => ({ fahrerA: d.fahrer_a, fahrerB: d.fahrer_b })));
        setAnwesenheiten(data.map(d => new Set(d.anwesenheit)));
        setLog(data.map(d => `Tag ${d.tag}: ${d.fahrer_a} → ${d.fahrer_b}`));
      }
    }
    lade();
  }, []);

  const toggleAnwesenheit = (name) => {
    const kopie = new Set<string>(aktuelleAnwesenheit);
    if (kopie.has(name)) kopie.delete(name);
    else kopie.add(name);
    setAktuelleAnwesenheit(kopie);
    setAktuellerVorschlag(simuliereFahrt(kopie, daten, anwesenheiten));
  };

  const neuerTagStarten = () => {
    setNeuerTagAktiv(true);
    setAktuelleAnwesenheit(new Set());
    setAktuellerVorschlag({ fahrerA: "", fahrerB: "" });
  };

  const fahrtSpeichern = async () => {
    const tag = daten.length + 1;
    const anwesend = Array.from(aktuelleAnwesenheit);
    const fahrer = aktuellerVorschlag;

    await supabase.from("fahrten").insert({
      tag,
      anwesenheit: anwesend,
      fahrer_a: fahrer.fahrerA,
      fahrer_b: fahrer.fahrerB
    });

    setDaten([...daten, fahrer]);
    setAnwesenheiten([...anwesenheiten, new Set(anwesend)]);
    setLog([...log, `Tag ${tag}: ${fahrer.fahrerA} → ${fahrer.fahrerB}`]);
    setNeuerTagAktiv(false);

    setTimeout(() => {
      tableContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);

  };

  const simulate = async () => {

    const aktuelleAnwesenheit = new Set<string>(["Anna", "Bernd", "Carla", "Dana", "Kurt"]);
    const aktuellerVorschlag = simuliereFahrt(aktuelleAnwesenheit, daten, anwesenheiten);

    const tag = daten.length + 1;
    const anwesend = Array.from(aktuelleAnwesenheit);
    const fahrer = aktuellerVorschlag;

    await supabase.from("fahrten").insert({
      tag,
      anwesenheit: anwesend,
      fahrer_a: fahrer.fahrerA,
      fahrer_b: fahrer.fahrerB
    });

    setDaten([...daten, fahrer]);
    setAnwesenheiten([...anwesenheiten, new Set(anwesend)]);
    setLog([...log, `Tag ${tag}: ${fahrer.fahrerA} → ${fahrer.fahrerB}`]);
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
    await supabase.from("fahrten").delete().gt( "tag", 0);
  };

  return (
      <div className="container py-4">
        <Head>
          <title>Fahrtverteilung</title>
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
        <h1 className="mb-3">Fahrtverteilung</h1>

        <div className="d-flex gap-2 mb-3">
          <button className="btn btn-primary" onClick={neuerTagStarten}>Neuer Tag</button>
          <button className="btn btn-outline-secondary" onClick={() => tableContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}>⤴ Zur neuesten Fahrt</button>

          <button className="btn btn-warning mb-3" onClick={reset}>Reset</button>
          <button className="btn btn-info mb-3" onClick={simulate}>Simulation</button>
        </div>

        {neuerTagAktiv && (
            <div className="card p-3 mb-3">
              <h5>Wer ist da?</h5>
              {mitglieder.map(name => (
                  <div className="form-check" key={name}>
                    <input className="form-check-input" type="checkbox" id={name} checked={aktuelleAnwesenheit.has(name)} onChange={() => toggleAnwesenheit(name)} />
                    <label className="form-check-label" htmlFor={name}>{name}</label>
                  </div>
              ))}
              <div className="mt-3">
                <div className="mb-2">
                  <label htmlFor="fahrerA" className="form-label"><strong>Fahrer ab Startpunkt 1:</strong></label>
                  <select className="form-select" id="fahrerA" value={aktuellerVorschlag.fahrerA} onChange={e => setAktuellerVorschlag({ ...aktuellerVorschlag, fahrerA: e.target.value })}>
                    <option value="">Wählen...</option>
                    {Array.from(aktuelleAnwesenheit).filter(name => startpunkt1.includes(name)).map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>
                <div className="mb-2">
                  <label htmlFor="fahrerB" className="form-label"><strong>Fahrer ab Zwischenstopp:</strong></label>
                  <select className="form-select" id="fahrerB" value={aktuellerVorschlag.fahrerB} onChange={e => setAktuellerVorschlag({ ...aktuellerVorschlag, fahrerB: e.target.value })}>
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
        style={{ maxHeight: "400px", overflowY: "auto" }}
        ref={tableContainerRef}
        onScroll={handleScroll}
      >
        <table className="table table-bordered table-sm">
          <thead>
          <tr>
              <th>Tag</th>
            {mitglieder.map(name => <th key={name}>{name}</th>)}
            <th>Fahrer</th>
          </tr>
          </thead>
          <tbody>
            {[...daten].slice(-visibleRows).reverse().map((f, i, arr) => (
              <tr key={i} className="">
                <td>{daten.length - arr.length + i + 1}</td>
                {mitglieder.map(m => (
                  <td key={m} className={f.fahrerA === m ? "table-warning" : f.fahrerB === m ? "table-primary" : ""}>{anwesenheiten[daten.indexOf(f)]?.has(m) ? "✓" : ""}</td>
                ))}
                <td><strong>{f.fahrerA} → {f.fahrerB}</strong></td>
              </tr>
          ))}
          </tbody>
        </table>
      </div>

      {/*<pre className="bg-light p-3">{log.slice(0, visibleRows).join("\n")}</pre>*/}
      </div>
  );
}
