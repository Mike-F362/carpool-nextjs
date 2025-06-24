import { createClient } from "@supabase/supabase-js";
import { randomUUID} from "node:crypto";
import {NextApiRequest, NextApiResponse} from "next";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ error: "Nur POST erlaubt" });
    const { email, role } = req.body;

    if (!role || (role !== "user" && role !== "admin")) {
        return res.status(400).json({ error: "Ungültige Rolle" });
    }

    const code = randomUUID();
    const { error } = await supabase.from("invites").insert({ code, email, role });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ code });
}
