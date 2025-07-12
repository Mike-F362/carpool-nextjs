import {createServerClient} from '@supabase/ssr'
import type {NextApiHandler, NextApiRequest, NextApiResponse} from 'next'

export function withAdminAuth(handler: NextApiHandler): NextApiHandler {
    return async (req: NextApiRequest, res: NextApiResponse) => {
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return Object.entries(req.cookies).map(([name, value]) => ({name, value}))
                    },
                    setAll() {
                        // optional: setzen wir hier nicht
                    },
                },
            }
        )

        const {data: {user}, error} = await supabase.auth.getUser()

        if (error || !user) {
            return res.status(401).json({error: 'Unauthorized'})
        }

        if (user.user_metadata?.role !== 'admin') {
            return res.status(403).json({error: 'Admin only'})
        }

        // Admin validiert, reiche den Aufruf an handler weiter
        return handler(req, res)
    }
}
