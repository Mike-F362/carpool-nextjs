import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ error: "Nur POST erlaubt" });
    const { code } = req.body;

    const { error } = await supabase.from("invites").delete().eq("code", code);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
}