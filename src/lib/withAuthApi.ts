import { NextApiHandler, NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabaseClient";

type Options = {
    role?: string;
};

export function withAuthApi(handler: NextApiHandler, options?: Options): NextApiHandler {
    return async (req: NextApiRequest, res: NextApiResponse) => {
        const {
            data: { user },
            error,
        } = await supabase.auth.getUser();

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

        return handler(req, res);
    };
}
