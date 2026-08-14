import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/middleware/checkAuth";

export async function middleware(request: NextRequest) {
    return await updateSession(request);
}

export const config = {
    matcher: ["/api/:path*"],
};
