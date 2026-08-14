/**
 * Fahrerverteilung: reine, testbare Kernlogik.
 *
 * Kein Supabase, kein React, keine Seiteneffekte - damit alles hier unter Test
 * gestellt werden kann. Die Etappenzahl ergibt sich aus den Stopps, es ist
 * nichts auf zwei Etappen verdrahtet.
 *
 * Modell (Soll/Ist-Saldo):
 *   Wer fuer eine Etappe in der Pflicht steht, bekommt  -w/|Pflichtige|
 *   Wer sie faehrt, bekommt                             +w
 *   saldo = ist - soll ; Vorschlag = kleinstes Saldo.
 *
 * Wer in der Pflicht steht, ist eine bewusste Entscheidung der Gruppe:
 *   'fahrberechtigte' - nur wer an dem Stopp ein Auto hat (heutiges Verhalten,
 *                       am Zwischenstopp also 50/50 zwischen ankommendem und
 *                       dort wartendem Fahrer)
 *   'mitfahrer'       - alle Insassen der Etappe teilen sich anteilig
 */

export interface Member {
    id: number;
    label: string;
    /** Stopp, an dem die Person zusteigt. 1 = Startpunkt, 2 = Zwischenstopp, ... */
    stop: number;
    canDrive: boolean;
}

export interface Tour {
    date: string; // ISO, lokal gebildet - nie via toISOString()
    present: number[];
    /** Fahrer je Etappe, Index 0 = Etappe 1. */
    drivers: number[];
}

export type Basis = "fahrberechtigte" | "mitfahrer";

export interface Options {
    basis: Basis;
    /** Gewicht je Etappe, Default 1. Erlaubt Kilometer statt Fahrtenzahl. */
    weights?: number[];
}

/** Saldo je Person und Etappe, Schluessel `${memberId}|${leg}`. */
export type Ledger = Map<string, number>;

const key = (id: number, leg: number) => `${id}|${leg}`;
const weightOf = (o: Options, leg: number) => o.weights?.[leg - 1] ?? 1;

/** Anzahl Etappen = Anzahl Stopps - 1, mindestens 1. */
export function legCount(members: Member[]): number {
    return Math.max(1, Math.max(...members.map((m) => m.stop)) - 1 + 1);
}

/**
 * Wer KANN Etappe `leg` fahren: wer an Stopp `leg` mit eigenem Auto zusteigt,
 * plus wer die Vorgaengeretappe gefahren hat - dessen Fahrzeug faehrt weiter.
 */
export function eligibleDrivers(
    members: Member[],
    present: number[],
    leg: number,
    prevDriver: number | null,
): number[] {
    const by = new Map(members.map((m) => [m.id, m]));
    const out = present.filter((id) => by.get(id)?.canDrive && by.get(id)!.stop === leg);
    if (prevDriver != null && !out.includes(prevDriver)) out.push(prevDriver);
    return out.sort((a, b) => a - b);
}

/** Wer FAEHRT auf Etappe `leg` mit: alle, die an einem Stopp <= leg zugestiegen sind. */
export function ridersOnLeg(members: Member[], present: number[], leg: number): number[] {
    const by = new Map(members.map((m) => [m.id, m]));
    return present.filter((id) => (by.get(id)?.stop ?? Infinity) <= leg).sort((a, b) => a - b);
}

/** Wer traegt die Pflicht fuer Etappe `leg` - der eine strittige Punkt im Modell. */
export function obligedFor(
    members: Member[],
    present: number[],
    leg: number,
    prevDriver: number | null,
    basis: Basis,
): number[] {
    return basis === "mitfahrer"
        ? ridersOnLeg(members, present, leg)
        : eligibleDrivers(members, present, leg, prevDriver);
}

/** Letztes Fahrdatum je Person ueber alle Etappen. */
export function lastDriveDates(history: Tour[]): Map<number, string> {
    const m = new Map<number, string>();
    for (const t of history) {
        for (const id of t.drivers) {
            if (id == null) continue;
            const cur = m.get(id);
            if (cur === undefined || t.date > cur) m.set(id, t.date);
        }
    }
    return m;
}

/**
 * Deterministische Auswahl: kleinstes Saldo, dann laengster Abstand zur letzten
 * Fahrt, dann kleinste Id. Die letzte Stufe garantiert Determinismus.
 */
export function chooseDriver(
    candidates: number[],
    ledger: Ledger,
    leg: number,
    last: Map<number, string>,
): number | null {
    if (candidates.length === 0) return null;
    return [...candidates].sort((a, b) => {
        const d = (ledger.get(key(a, leg)) ?? 0) - (ledger.get(key(b, leg)) ?? 0);
        if (Math.abs(d) > 1e-9) return d;
        const la = last.get(a) ?? "",
            lb = last.get(b) ?? "";
        if (la !== lb) return la < lb ? -1 : 1;
        return a - b;
    })[0];
}

/** Vorschlag fuer alle Etappen. Etappe n haengt von der Wahl auf n-1 ab. */
export function suggestDrivers(
    members: Member[],
    present: number[],
    ledger: Ledger,
    last: Map<number, string>,
    opts: Options,
): (number | null)[] {
    const legs = legCount(members);
    const out: (number | null)[] = [];
    for (let leg = 1; leg <= legs; leg++) {
        const prev = leg === 1 ? null : out[leg - 2];
        const cands = eligibleDrivers(members, present, leg, prev ?? null);
        out.push(chooseDriver(cands, ledger, leg, last));
    }
    return out;
}

/**
 * Buchung einer gefahrenen Tour. Entspricht dem DB-Trigger auf trip_drivers.
 * Wird auch bei uebersteuerten Vorschlaegen aufgerufen - genau dadurch gleicht
 * sich ein manueller Eingriff spaeter wieder aus.
 */
export function postTour(ledger: Ledger, members: Member[], tour: Tour, opts: Options): Ledger {
    const legs = legCount(members);
    for (let leg = 1; leg <= legs; leg++) {
        const prev = leg === 1 ? null : tour.drivers[leg - 2];
        const duty = obligedFor(members, tour.present, leg, prev ?? null, opts.basis);
        if (duty.length === 0) continue;
        const w = weightOf(opts, leg);
        for (const id of duty) {
            const k = key(id, leg);
            ledger.set(k, (ledger.get(k) ?? 0) - w / duty.length);
        }
        const driver = tour.drivers[leg - 1];
        if (driver != null) {
            const k = key(driver, leg);
            ledger.set(k, (ledger.get(k) ?? 0) + w);
        }
    }
    return ledger;
}

export function buildLedger(members: Member[], history: Tour[], opts: Options): Ledger {
    const l: Ledger = new Map();
    for (const t of history) postTour(l, members, t, opts);
    return l;
}

export interface Fairness {
    soll: number;
    ist: number;
    delta: number;
    tage: number;
}

/** Soll/Ist je Person und Etappe, gemessen am angegebenen Massstab. */
export function evaluateFairness(members: Member[], history: Tour[], opts: Options): Map<string, Fairness> {
    const st = new Map<string, Fairness>();
    const get = (id: number, leg: number) => {
        const k = key(id, leg);
        if (!st.has(k)) st.set(k, { soll: 0, ist: 0, delta: 0, tage: 0 });
        return st.get(k)!;
    };
    const legs = legCount(members);

    for (const t of history) {
        for (let leg = 1; leg <= legs; leg++) {
            const prev = leg === 1 ? null : t.drivers[leg - 2];
            const duty = obligedFor(members, t.present, leg, prev ?? null, opts.basis);
            if (duty.length === 0) continue;
            const w = weightOf(opts, leg);
            for (const id of duty) {
                const s = get(id, leg);
                s.soll += w / duty.length;
                s.tage += 1;
            }
            const driver = t.drivers[leg - 1];
            if (driver != null) get(driver, leg).ist += w;
        }
    }
    for (const s of st.values()) s.delta = s.ist - s.soll;
    return st;
}

/** Spreizung max-min der Deltas auf einer Etappe. Das ist "stimmt die Summe?". */
export function spreadOnLeg(members: Member[], history: Tour[], leg: number, opts: Options): number {
    const st = evaluateFairness(members, history, opts);
    const d = members
        .map((m) => st.get(key(m.id, leg)))
        .filter((s): s is Fairness => !!s && s.tage > 0)
        .map((s) => s.delta);
    return d.length ? Math.max(...d) - Math.min(...d) : 0;
}

/**
 * Datum lokal als YYYY-MM-DD. Ersetzt toISOString().split('T')[0], das in
 * Zeitzonen oestlich von UTC einen Tag zurueckspringen kann.
 */
export function localDateString(d: Date): string {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
