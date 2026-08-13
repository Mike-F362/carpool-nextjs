import type {NextApiHandler, NextApiRequest, NextApiResponse} from 'next'
import {createApiClient} from '@/lib/supabase/api'

export function withAdminAuth(handler: NextApiHandler): NextApiHandler {
    return async (req: NextApiRequest, res: NextApiResponse) => {
        const supabase = createApiClient(req)

        const {data: {user}, error} = await supabase.auth.getUser()

        if (error || !user) {
            return res.status(401).json({error: 'Unauthorized'})
        }

        // The role lives in app_metadata. user_metadata would be worthless
        // here: clients can write it through auth.updateUser(), so any user
        // could make themselves an admin. app_metadata can only be changed
        // with the service role key.
        if (user.app_metadata?.role !== 'admin') {
            return res.status(403).json({error: 'Admin only'})
        }

        // Admin verified, pass the call on to the handler
        return handler(req, res)
    }
}
