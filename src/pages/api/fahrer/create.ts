import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseClientAdmin";
import { withAdminAuth } from "@/lib/middleware/withAdminAuth";

const securedHandler = withAdminAuth(handler);
export default securedHandler;

async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { name, startpunkt, label } = req.body;

    const { data, error } = await supabaseAdmin.from("fahrer").insert([{ name, startpunkt, label }]);

    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json(data);
}
