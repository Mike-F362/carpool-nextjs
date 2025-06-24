// Erstellt den ersten Admin-User, nur wenn noch kein User existiert

import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Nur POST erlaubt" });
    }

    const { email, password } = req.body;

    // Gibt es bereits einen Benutzer?
    const { data: users, error: listError } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1
    });

    if (listError) {
        return res.status(500).json({ error: "Fehler beim Abrufen der Benutzer" });
    }

    if (users?.users?.length > 0) {
        return res.status(403).json({ error: "Setup ist gesperrt: Benutzer existieren bereits." });
    }

    // Neuen Admin anlegen
    const { error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: "admin" }
    });

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true });
}
