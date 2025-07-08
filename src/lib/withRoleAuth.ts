import { GetServerSideProps, GetServerSidePropsContext } from "next";
import { createClient } from "@supabase/supabase-js";
import nookies from "nookies";

export function withRoleAuth(requiredRole: string, inner: GetServerSideProps = async () => ({ props: {} })) {
    return async function (ctx: GetServerSidePropsContext) {
        const cookies = nookies.get(ctx);
        const token = cookies["sb-access-token"];

        if (!token) {
            return {
                redirect: {
                    destination: "/",
                    permanent: false,
                },
            };
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
            {
                global: {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            }
        );

        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
            return {
                redirect: {
                    destination: "/",
                    permanent: false,
                },
            };
        }

        const role = user.user_metadata?.role;
        if (role !== requiredRole) {
            return {
                redirect: {
                    destination: "/",
                    permanent: false,
                },
            };
        }

        return await inner(ctx);
    };
}
