import {NextApiRequest, NextApiResponse} from 'next';
import {supabaseAdmin} from "@/lib/supabaseClientAdmin";
import {withAdminAuth} from '@/lib/middleware/withAdminAuth'
import {ROLES, type Role} from '@/lib/roles'

const securedHandler = withAdminAuth(handler);
export default securedHandler;

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({error: "Nur POST erlaubt"});

    const {id, role} = req.body;

    if (!id || typeof id !== "string") {
        return res.status(400).json({error: "Fehlende oder ungueltige Benutzer-ID"});
    }
    if (!ROLES.includes(role as Role)) {
        return res.status(400).json({error: `Unbekannte Rolle: ${role}`});
    }

    // app_metadata statt user_metadata: nur der Service-Role-Key darf hier
    // schreiben. user_metadata koennte der Nutzer selbst setzen.
    const {error} = await supabaseAdmin.auth.admin.updateUserById(id, {
        app_metadata: {role}
    });

    if (error) return res.status(500).json({error: error.message});
    res.status(200).json({success: true});
}
