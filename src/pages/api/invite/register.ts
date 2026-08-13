import type {NextApiRequest, NextApiResponse} from "next";
import {supabaseAdmin} from "@/lib/supabaseClientAdmin";
import {normalizeRole} from "@/lib/roles";

/**
 * Einloesen eines Einladungscodes. Oeffentlich erreichbar (die Middleware
 * laesst /register ohne Sitzung durch) - deshalb muss der Code hier
 * vollstaendig geprueft werden.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({error: "Nur POST erlaubt"});

    const {email, password, code} = req.body;
    if (!email || !password || !code) return res.status(400).json({error: "Fehlende Felder"});
    if (typeof email !== "string" || typeof password !== "string" || typeof code !== "string") {
        return res.status(400).json({error: "Ungueltige Felder"});
    }

    const jetzt = new Date().toISOString();

    // Code in einem einzigen Schritt entwerten und dabei pruefen: nur ein
    // ungenutzter, nicht abgelaufener Code wird zurueckgegeben. Zwei parallele
    // Anfragen mit demselben Code koennen so nicht beide durchkommen -
    // eine Pruefung vor dem Update haette genau dieses Rennen offen gelassen.
    const {data: invite, error: claimError} = await supabaseAdmin
        .from("invites")
        .update({used: true, used_by: email})
        .eq("code", code)
        .eq("used", false)
        .or(`expires_at.is.null,expires_at.gt.${jetzt}`)
        .select()
        .maybeSingle();

    if (claimError) {
        return res.status(500).json({error: claimError.message});
    }

    if (!invite) {
        // Bewusst eine einzige Meldung fuer "unbekannt", "schon benutzt" und
        // "abgelaufen": sonst liesse sich damit die Gueltigkeit fremder Codes
        // abfragen.
        return res.status(400).json({error: "Ungueltiger oder abgelaufener Einladungscode"});
    }

    // Einladung auf eine feste Adresse: nur diese darf sie einloesen.
    if (invite.email && invite.email.toLowerCase() !== email.toLowerCase()) {
        await freigeben(code);
        return res.status(400).json({error: "Ungueltiger oder abgelaufener Einladungscode"});
    }

    const {error: createError} = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        // Rolle in app_metadata (nur mit Service-Role-Key schreibbar) und nur
        // aus der bekannten Liste - ein manipulierter invites-Datensatz kann so
        // keine beliebige Rolle vergeben.
        app_metadata: {role: normalizeRole(invite.role)},
    });

    if (createError) {
        // Anlegen fehlgeschlagen: Code wieder freigeben, sonst ist die
        // Einladung verbraucht, ohne dass ein Konto entstanden ist.
        await freigeben(code);
        return res.status(500).json({error: createError.message});
    }

    return res.status(200).json({success: true});
}

async function freigeben(code: string) {
    await supabaseAdmin
        .from("invites")
        .update({used: false, used_by: null})
        .eq("code", code);
}
