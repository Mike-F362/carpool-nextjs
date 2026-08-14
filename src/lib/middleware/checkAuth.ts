import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/**
 * API-Routen, die ohne Sitzung erreichbar sein muessen. Beide pruefen die
 * Berechtigung im Handler selbst:
 *
 *   /api/invite/register  entwertet den Einladungscode atomar und prueft dabei
 *                         `used` und `expires_at`.
 *   /api/setup-admin      legt den ersten Admin an und verweigert den Dienst,
 *                         sobald irgendein Benutzer existiert. Ohne diese
 *                         Ausnahme waere /setup auf einer frischen Installation
 *                         nicht erreichbar - genau dann gibt es ja noch keine
 *                         Sitzung.
 *
 * Exakter Pfadvergleich (oder Praefix mit '/'), damit die Liste nicht
 * versehentlich fremde Routen mit gleicher Endung freigibt.
 */
const OEFFENTLICHE_API_ROUTEN = ["/api/invite/register", "/api/setup-admin"] as const;

function istOeffentlicheApiRoute(pathname: string): boolean {
    return OEFFENTLICHE_API_ROUTEN.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => {
                        request.cookies.set(name, value);
                    });
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) => {
                        supabaseResponse.cookies.set(name, value, options);
                    });
                },
            },
        },
    );

    // Do not run code between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    // IMPORTANT: DO NOT REMOVE auth.getUser()

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user && request.nextUrl.pathname.startsWith("/api") && !istOeffentlicheApiRoute(request.nextUrl.pathname)) {
        return new NextResponse(JSON.stringify({ error: "Unauthorized 401" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    // IMPORTANT: You *must* return the supabaseResponse object as it is.
    // If you're creating a new response object with NextResponse.next() make sure to:
    // 1. Pass the request in it, like so:
    //    const myNewResponse = NextResponse.next({ request })
    // 2. Copy over the cookies, like so:
    //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
    // 3. Change the myNewResponse object to fit your needs, but avoid changing
    //    the cookies!
    // 4. Finally:
    //    return myNewResponse
    // If this is not done, you may be causing the browser and server to go out
    // of sync and terminate the user's session prematurely!

    return supabaseResponse;
}
