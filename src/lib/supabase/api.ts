import { createServerClient } from "@supabase/ssr";
import type { NextApiRequest } from "next";

/**
 * Supabase client for API routes (Pages Router), bound to the caller's
 * session.
 *
 * The module client from `@/lib/supabaseClient` carries no session on the
 * server and therefore acts as role `anon`. With RLS limited to
 * `authenticated`, API routes have to pass the caller's cookie along or every
 * query comes back empty.
 *
 * Cookies are read only. Refreshing the session is the middleware's job, see
 * `src/lib/middleware/checkAuth.ts`.
 */
export function createApiClient(req: NextApiRequest) {
    return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        cookies: {
            getAll() {
                return Object.entries(req.cookies)
                    .filter(([, value]) => value !== undefined)
                    .map(([name, value]) => ({ name, value: value as string }));
            },
            setAll() {
                // intentionally empty, see comment above
            },
        },
    });
}
