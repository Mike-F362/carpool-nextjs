import type { NextApiRequest, NextApiResponse } from "next";
import { createApiClient } from "@/lib/supabase/api";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
    // Session-bound client: runs as `authenticated`, not as `anon`
    const supabase = createApiClient(_req);

    const { data, error } = await supabase.rpc("get_last_tour_per_driver");

    if (error) return res.status(500).json({ error: error.message });

    res.status(200).json(data);
}
