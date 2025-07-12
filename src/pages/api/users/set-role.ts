import {NextApiRequest, NextApiResponse} from 'next';
import {supabaseAdmin} from "@/lib/supabaseClientAdmin";
import {withAdminAuth} from '@/lib/middleware/withAdminAuth'

const securedHandler = withAdminAuth(handler);
export default securedHandler;

async function handler(req: NextApiRequest, res: NextApiResponse) {
    const {id, role} = req.body;

    const {error} = await supabaseAdmin.auth.admin.updateUserById(id, {
        user_metadata: {role}
    });

    if (error) return res.status(500).json({error: error.message});
    res.status(200).json({success: true});
}