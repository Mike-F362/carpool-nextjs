import {NextApiRequest, NextApiResponse} from 'next';
import {supabaseAdmin} from "@/lib/supabaseClientAdmin";
import {User as SupabaseUser} from "@supabase/auth-js";
import User from "@/interfaces/user";
import {withAdminAuth} from '@/lib/middleware/withAdminAuth'

const securedHandler = withAdminAuth(handler);
export default securedHandler;

async function handler(_req: NextApiRequest, res: NextApiResponse) {

    const {data, error} = await supabaseAdmin.auth.admin.listUsers();
    if (error) return res.status(500).json({error: error.message});

    const users = data.users.map((u: SupabaseUser): User => ({
        id: u.id,
        email: u.email,
        role: u.user_metadata?.role || 'user'
    }));

    res.status(200).json(users);
}