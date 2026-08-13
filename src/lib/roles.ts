/**
 * Zulaessige Rollen. Die Rolle wird ausschliesslich in `app_metadata`
 * gefuehrt - dort kann sie nur mit dem Service-Role-Key gesetzt werden.
 */
export const ROLES = ['user', 'admin'] as const;

export type Role = typeof ROLES[number];

export const DEFAULT_ROLE: Role = 'user';

export function normalizeRole(value: unknown): Role {
    return ROLES.includes(value as Role) ? (value as Role) : DEFAULT_ROLE;
}
