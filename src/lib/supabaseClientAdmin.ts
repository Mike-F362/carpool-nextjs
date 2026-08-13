import {createClient} from "@supabase/supabase-js";

/**
 * Client mit Service-Role-Key. Umgeht RLS vollstaendig - darf niemals in ein
 * Client-Bundle geraten.
 *
 * Die Variable heisst bewusst NICHT NEXT_PUBLIC_*: dieses Praefix laesst
 * Next.js den Wert im Klartext in jedes Bundle inlinen, das die Variable
 * referenziert. Ohne das Praefix ist sie nur im Node-Prozess sichtbar.
 *
 * Der Guard darunter ersetzt `import 'server-only'` (das erst als Abhaengigkeit
 * installiert werden muesste) und schlaegt beim ersten Import im Browser zu.
 */
if (typeof window !== "undefined") {
    throw new Error(
        "supabaseClientAdmin darf nur serverseitig importiert werden " +
        "(API-Route, getServerSideProps)."
    );
}

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
    throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY ist nicht gesetzt. Siehe .env.example.local."
    );
}

export const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
        auth: {
            // Ein Serverprozess hat keine Nutzersitzung, die persistiert werden
            // muesste. persistSession: true wuerde Tokens prozessweit teilen.
            persistSession: false,
            autoRefreshToken: false,
        },
    }
);
