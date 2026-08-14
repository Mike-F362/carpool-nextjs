import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseClientAdmin";
import { withAdminAuth } from "@/lib/middleware/withAdminAuth";

const securedHandler = withAdminAuth(handler);
export default securedHandler;

async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.body;

    const { error } = await supabaseAdmin.from("fahrer").delete().eq("id", id);

    if (error) return res.status(500).json({ error: error.message });
    res.status(204).end();
}
