import type {NextApiRequest, NextApiResponse} from "next";
import {supabaseAdmin} from "@/lib/supabaseClientAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({error: "Nur GET erlaubt"});
    }

    const {data, error} = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1
    });

    if (error) {
        return res.status(500).json({error: "Fehler beim Abruf"});
    }

    return res.status(200).json({exists: data.users.length > 0});
}
