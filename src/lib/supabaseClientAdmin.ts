import {createClient} from "@supabase/supabase-js";

/**
 * Client using the service role key. Bypasses RLS entirely and must never end
 * up in a client bundle.
 *
 * The variable deliberately carries no NEXT_PUBLIC_ prefix: that prefix makes
 * Next.js inline the value in plain text into every bundle referencing it.
 * Without it, the value stays inside the Node process.
 *
 * The guard below stands in for `import 'server-only'`, which would first have
 * to be added as a dependency, and trips on the first import in a browser.
 */
if (typeof window !== "undefined") {
    throw new Error(
        "supabaseClientAdmin must only be imported on the server " +
        "(API route, getServerSideProps)."
    );
}

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
    throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY is not set. See .env.example.local."
    );
}

export const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
        auth: {
            // A server process has no user session worth persisting, and
            // persistSession: true would share tokens across the process.
            persistSession: false,
            autoRefreshToken: false,
        },
    }
);
