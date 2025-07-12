import {NextApiHandler, NextApiRequest, NextApiResponse} from "next";

type Options = {
    role?: string;
};

export function withAuthApi(handler: NextApiHandler, options?: Options): NextApiHandler {
    return async (req: NextApiRequest, res: NextApiResponse) => {
        /*
                // const supabase = await createClient();
                const supabase = createServerClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                    {
                        getCookie: (name: string) => req.cookies[name],
                        setCookie: (name: string, value: string, options) => {
                            const cookie = require("cookie");
                            res.setHeader("Set-Cookie", cookie.serialize(name, value, options));
                        },
                        removeCookie: (name: string, options) => {
                            const cookie = require("cookie");
                            res.setHeader("Set-Cookie", cookie.serialize(name, "", { ...options, maxAge: -1 }));
                        },
                    }
                );

                console.log("req.headers.cookie:", req.headers.cookie);
                console.log("req.cookies:", req.cookies);

                const {
                    data: { user },
                    error,
                } = await supabase.auth.getUser();
                // } = await supabase.auth.getUser(req.cookies['sb-access-token']);

                if (!user || error) {
                    return res.status(401).json({ error: "Nicht authentifiziert" });
                }

                // optional check role
                if (options?.role) {
                    const role = user.user_metadata?.role;

                    if (role !== options.role) {
                        return res.status(403).json({ error: "Keine Berechtigung" });
                    }

                    (req as any).role = role;
                }

                (req as any).user = user;
        */
        return handler(req, res);
    };
}
