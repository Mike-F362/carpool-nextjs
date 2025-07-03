import type {NextApiRequest, NextApiResponse} from "next";
import {createClient} from "@supabase/supabase-js";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({error: "Nur POST erlaubt"});

    const {email, password, code} = req.body;
    if (!email || !password || !code) return res.status(400).json({error: "Fehlende Felder"});

    const {data: invite, error: inviteError} = await supabaseAdmin
        .from("invites")
        .select("*")
        .eq("code", code)
        .maybeSingle();

    if (inviteError || !invite) {
        return res.status(400).json({error: "Ungültiger Einladungscode"});
    }

    const {error: createError} = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {role: invite.role},
    });

    if (createError) {
        return res.status(500).json({error: createError.message});
    }

    await supabaseAdmin.from("invites").update({used: true}).eq("code", code);

    return res.status(200).json({success: true});
}
