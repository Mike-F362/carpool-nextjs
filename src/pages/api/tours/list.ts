import type {NextApiRequest, NextApiResponse} from "next";
import {createApiClient} from "@/lib/supabase/api";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
    // Session-bound client: runs as `authenticated`, not as `anon`
    const supabase = createApiClient(_req);
    const {data, error} = await supabase.rpc("load_tours");

    if (error) {
        console.error("Error loading tours:", error.message);
        return res.status(500).json({error: error.message});
    }

    const tours = data.map((row: { id: number; datum: Date; fahrera_id: number; fahrerb_id: number; anwesend_ids: number[]; }) => ({
        id: row.id,
        datum: row.datum,
        fahrerA_id: row.fahrera_id,
        fahrerB_id: row.fahrerb_id,
        anwesend_ids: row.anwesend_ids,
    }));

    const maxDate = data.length > 0 ? data[0].max_datum : null;

    return res.status(200).json({tours, maxDate});
}
