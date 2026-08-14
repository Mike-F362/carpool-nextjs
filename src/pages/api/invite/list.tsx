import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseClientAdmin";
import { withAdminAuth } from "@/lib/middleware/withAdminAuth";

const securedHandler = withAdminAuth(handler);
export default securedHandler;

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).json({ error: "Nur GET erlaubt" });

    const { data, error } = await supabaseAdmin.from("invites").select("*").order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
}
