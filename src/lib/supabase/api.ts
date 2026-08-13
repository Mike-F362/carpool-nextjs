import {createServerClient} from '@supabase/ssr'
import type {NextApiRequest} from 'next'

/**
 * Supabase-Client fuer API-Routen (Pages Router), gebunden an die Sitzung des
 * Aufrufers.
 *
 * Wichtig: Der Modul-Client aus `@/lib/supabaseClient` traegt serverseitig
 * keine Sitzung und laeuft daher als Rolle `anon`. Solange RLS nur noch
 * `authenticated` erlaubt, muessen API-Routen den Cookie des Aufrufers
 * durchreichen - sonst liefert jede Abfrage leere Ergebnisse.
 *
 * Cookies werden nur gelesen. Das Auffrischen der Sitzung uebernimmt die
 * Middleware (`src/lib/middleware/checkAuth.ts`).
 */
export function createApiClient(req: NextApiRequest) {
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return Object.entries(req.cookies)
                        .filter(([, value]) => value !== undefined)
                        .map(([name, value]) => ({name, value: value as string}))
                },
                setAll() {
                    // bewusst leer: siehe Kommentar oben
                },
            },
        }
    )
}
