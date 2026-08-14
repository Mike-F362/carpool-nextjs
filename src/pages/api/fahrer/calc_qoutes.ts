import type { SupabaseClient } from "@supabase/supabase-js";

export async function get_drivers(
    supabase: SupabaseClient<any, "public" extends keyof any ? "public" : string & keyof any, any>,
    startPoint: number,
) {
    // Zwischenfahrer mit startpunkt = 2
    const { data: zwischenfahrer, error: err1 } = await supabase
        .from("fahrer")
        .select("id")
        .eq("startpunkt", startPoint);

    // if (err1) return res.status(500).json({ error: err1.message });

    const zwischenIds = new Set(zwischenfahrer.map((f) => f.id));
    return zwischenIds;
}

export async function calcQuoteSp(
    supabase: SupabaseClient<any, "public" extends keyof any ? "public" : string & keyof any, any>,
    anwesend: number[],
    zwischenIds: Set<any>,
) {
    const anwesendOhneZwischen = anwesend.filter((id) => !zwischenIds.has(id));

    // Fahrten abrufen
    const { data: fahrten, error } = await supabase.from("fahrten").select("fahrerA_id, anwesend_ids");

    // TODO: error handling
    // if (error) return res.status(500).json({ error: error.message });

    // TODO: Berechnung aus DB
    // Berechnung
    const counter = new Map<number, number>();
    for (const fahrt of fahrten) {
        const aktuelleAnwesenheit = (fahrt.anwesend_ids || []).filter((id: string) => !zwischenIds.has(id));
        if (eqArraySet(aktuelleAnwesenheit, anwesendOhneZwischen)) {
            const count = counter.get(fahrt.fahrerA_id) || 0;
            counter.set(fahrt.fahrerA_id, count + 1);
        }
    }
    return counter;
}

export async function calcQuoteZw(
    supabase: SupabaseClient<any, "public" extends keyof any ? "public" : string & keyof any, any>,
    fahrerA_id: number,
    anwesend: number[],
    startPunktIds: Set<any>,
) {
    // Startpunktfahrer mit startpunkt = 1
    const { data: startPunktfahrer, error: err1 } = await supabase.from("fahrer").select("id").eq("startpunkt", 1);

    // if (err1) return res.status(500).json({error: err1.message});

    // Fahrten abrufen
    const { data: fahrten, error } = await supabase
        .from("fahrten")
        .select("fahrerB_id, anwesend_ids")
        .eq("fahrerA_id", fahrerA_id);

    // TODO: error handling
    // if (error) return res.status(500).json({error: error.message});

    // TODO: Berechnung aus DB
    const counter = new Map<string, number>();
    for (const fahrt of fahrten) {
        const aktuelleAnwesenheit = (fahrt.anwesend_ids || []).filter((id: string) => !startPunktIds.has(id));
        if (eqArraySet(aktuelleAnwesenheit, anwesend)) {
            const count = counter.get(fahrt.fahrerB_id) || 0;
            counter.set(fahrt.fahrerB_id, count + 1);
        }
    }

    return counter;
}

function eqArraySet(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;
    const setA = new Set(a);
    const setB = new Set(b);
    for (const val of setA) {
        if (!setB.has(val)) return false;
    }
    return true;
}
