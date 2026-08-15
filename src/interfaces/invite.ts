import type { Role } from "@/lib/roles";

/** Row of the `invites` table, as /api/invite/list returns it. */
export default interface Invite {
    id: string;
    code: string;
    created_at: string;
    used: boolean;
    used_by: string | null;
    email: string | null;
    role: Role;
    expires_at: string | null;
}
