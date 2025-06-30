import {createPagesServerClient as createRouteHandlerSupabaseClient} from '@supabase/auth-helpers-nextjs';
import {NextApiRequest, NextApiResponse} from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const supabase = createRouteHandlerSupabaseClient({req, res});

    const anwesend = req.body.anwesend as string[] || [];
    const fahrerA_id = req.body.fahrerA_id as number || 0;

    // Startpunktfahrer mit startpunkt = 1
    const {data: startPunktfahrer, error: err1} = await supabase
        .from("fahrer")
        .select("id")
        .eq("startpunkt", 1);

    if (err1) return res.status(500).json({error: err1.message});

    const startPunktIds = new Set(startPunktfahrer.map((f) => f.id));
    const anwesendOhneStart = anwesend.filter((id) => !startPunktIds.has(id));

    // Fahrten abrufen
    const {data: fahrten, error} = await supabase
        .from("fahrten")
        .select("fahrerB_id, anwesend_ids")
        .eq('fahrerA_id', fahrerA_id)
    ;

    if (error) return res.status(500).json({error: error.message});

    // TODO: Berechnung aus DB
    const counter = new Map<string, number>();
    for (const fahrt of fahrten) {
        const aktuelleAnwesenheit = (fahrt.anwesend_ids || []).filter((id: string) => !startPunktIds.has(id));
        if (eqArraySet(aktuelleAnwesenheit, anwesendOhneStart)) {
            const count = counter.get(fahrt.fahrerB_id) || 0;
            counter.set(fahrt.fahrerB_id, count + 1);
        }
    }

    res.status(200).json(Object.fromEntries(counter));
}

function eqArraySet(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    const setA = new Set(a);
    const setB = new Set(b);
    for (const val of setA) {
        if (!setB.has(val)) return false;
    }
    return true;
}