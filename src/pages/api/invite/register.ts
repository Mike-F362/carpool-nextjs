import type {NextApiRequest, NextApiResponse} from "next";
import {supabaseAdmin} from "@/lib/supabaseClientAdmin";
import {normalizeRole} from "@/lib/roles";

/**
 * Redeems an invite code. Reachable without a session (the middleware lets
 * /register through), so the code has to be validated in full right here.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({error: "Nur POST erlaubt"});

    const {email, password, code} = req.body;
    if (!email || !password || !code) return res.status(400).json({error: "Fehlende Felder"});
    if (typeof email !== "string" || typeof password !== "string" || typeof code !== "string") {
        return res.status(400).json({error: "Ungueltige Felder"});
    }

    const now = new Date().toISOString();

    // Invalidate and validate in a single step: only an unused, unexpired code
    // comes back. Two concurrent requests carrying the same code cannot both
    // get through - checking before updating would have left exactly that race
    // open.
    const {data: invite, error: claimError} = await supabaseAdmin
        .from("invites")
        .update({used: true, used_by: email})
        .eq("code", code)
        .eq("used", false)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .select()
        .maybeSingle();

    if (claimError) {
        return res.status(500).json({error: claimError.message});
    }

    if (!invite) {
        // One message for "unknown", "already used" and "expired" on purpose:
        // separate ones would turn this endpoint into an oracle for the
        // validity of other people's codes.
        return res.status(400).json({error: "Ungueltiger oder abgelaufener Einladungscode"});
    }

    // Invite addressed to a fixed account: only that address may redeem it.
    if (invite.email && invite.email.toLowerCase() !== email.toLowerCase()) {
        await release(code);
        return res.status(400).json({error: "Ungueltiger oder abgelaufener Einladungscode"});
    }

    const {error: createError} = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        // Role in app_metadata (writable with the service role key only) and
        // taken from the known list, so a tampered invites row cannot hand out
        // an arbitrary role.
        app_metadata: {role: normalizeRole(invite.role)},
    });

    if (createError) {
        // Creating the account failed: release the code again, otherwise the
        // invite is spent without an account to show for it.
        await release(code);
        return res.status(500).json({error: createError.message});
    }

    return res.status(200).json({success: true});
}

async function release(code: string) {
    await supabaseAdmin
        .from("invites")
        .update({used: false, used_by: null})
        .eq("code", code);
}
