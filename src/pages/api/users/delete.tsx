import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseClientAdmin";
import { withAdminAuth } from "@/lib/middleware/withAdminAuth";

const securedHandler = withAdminAuth(handler);
export default securedHandler;

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ error: "Nur POST erlaubt" });
    const { id } = req.body;

    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
}
