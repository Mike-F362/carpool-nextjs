import type {NextApiHandler, NextApiRequest, NextApiResponse} from 'next'
import {createApiClient} from '@/lib/supabase/api'

export function withAdminAuth(handler: NextApiHandler): NextApiHandler {
    return async (req: NextApiRequest, res: NextApiResponse) => {
        const supabase = createApiClient(req)

        const {data: {user}, error} = await supabase.auth.getUser()

        if (error || !user) {
            return res.status(401).json({error: 'Unauthorized'})
        }

        // Die Rolle liegt in app_metadata. user_metadata waere hier wertlos:
        // es ist per auth.updateUser() vom Client selbst beschreibbar, jeder
        // Nutzer koennte sich damit zum Admin machen. app_metadata laesst sich
        // ausschliesslich mit dem Service-Role-Key aendern.
        if (user.app_metadata?.role !== 'admin') {
            return res.status(403).json({error: 'Admin only'})
        }

        // Admin validiert, reiche den Aufruf an handler weiter
        return handler(req, res)
    }
}
