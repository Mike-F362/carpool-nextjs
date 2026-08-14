import type { NextApiRequest, NextApiResponse } from "next";
import { ladeQuotesZw } from "@/pages/api/fahrer/calc_qoutes";
import { createApiClient } from "@/lib/supabase/api";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Session-bound client: runs as `authenticated`, not as `anon`
    const supabase = createApiClient(req);

    try {
        return res.status(200).json(await ladeQuotesZw(supabase));
    } catch (fehler) {
        console.error("Error loading leg 2 quotas:", fehler);
        return res.status(500).json({ error: (fehler as Error).message });
    }
}
