import { createServerClient } from "@supabase/ssr";
import type { GetServerSideProps, GetServerSidePropsContext, Redirect } from "next";

export function withRoleAuthSsr(requiredRole: string, inner: GetServerSideProps = async () => ({ props: {} })) {
    return async (
        ctx: GetServerSidePropsContext,
    ): Promise<
        { props: Promise<{ [p: string]: any }> | { [p: string]: any } } | { redirect: Redirect } | { notFound: true }
    > => {
        const { req } = ctx;

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll: () => Object.entries(req.cookies).map(([name, value]) => ({ name, value })),
                    setAll: () => {},
                },
            },
        );

        const {
            data: { user },
            error,
        } = await supabase.auth.getUser();

        if (error || !user) {
            return {
                redirect: {
                    destination: "/",
                    permanent: false,
                },
            };
        }

        // Role from app_metadata: writable with the service role key only.
        // user_metadata is something the client can set itself.
        if (user.app_metadata?.role !== requiredRole) {
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
