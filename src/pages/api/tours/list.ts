import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { data, error } = await supabase.rpc("load_tours");

    if (error) {
        console.error("Fehler beim Laden der Fahrten:", error.message);
        return res.status(500).json({ error: error.message });
    }

    const tours = data.map((row) => ({
        id: row.id,
        datum: row.datum,
        fahrerA_id: row.fahrera_id,
        fahrerB_id: row.fahrerb_id,
        anwesend_ids: row.anwesend_ids,
    }));

    const maxDate = data.length > 0 ? data[0].max_datum : null;

    return res.status(200).json({ tours, maxDate });
}
