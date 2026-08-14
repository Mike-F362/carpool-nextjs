/**
 * Known roles. The role is kept in `app_metadata` only, where it can be
 * written with the service role key alone.
 */
export const ROLES = ["user", "admin"] as const;

export type Role = (typeof ROLES)[number];

export const DEFAULT_ROLE: Role = "user";

export function normalizeRole(value: unknown): Role {
    return ROLES.includes(value as Role) ? (value as Role) : DEFAULT_ROLE;
}
