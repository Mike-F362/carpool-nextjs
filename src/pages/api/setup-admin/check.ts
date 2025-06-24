import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Nur GET erlaubt" });
    }

    const { data, error } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1
    });

    if (error) {
        return res.status(500).json({ error: "Fehler beim Abruf" });
    }

    return res.status(200).json({ exists: data.users.length > 0 });
}
