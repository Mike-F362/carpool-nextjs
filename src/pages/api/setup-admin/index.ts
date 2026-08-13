import type {NextApiRequest, NextApiResponse} from "next";
import {supabaseAdmin} from "@/lib/supabaseClientAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({error: "Nur POST erlaubt"});
    }

    const {email, password} = req.body;

    const {data: users, error: listError} = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1
    });

    if (listError) {
        return res.status(500).json({error: "Fehler beim Abrufen der Benutzer"});
    }

    if (users?.users?.length > 0) {
        return res.status(403).json({error: "Setup ist gesperrt: Benutzer existieren bereits."});
    }

    const {error} = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        // app_metadata: writable with the service role key only
        app_metadata: {role: "admin"}
    });

    if (error) {
        return res.status(500).json({error: error.message});
    }

    return res.status(200).json({success: true});
}
