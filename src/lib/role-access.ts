import type { GroupRoleType } from '@/enum/group'

export function hasRoleAccess(
  role: string | null | undefined,
  allowedRoles: readonly GroupRoleType[],
): boolean {
  return typeof role === 'string' && allowedRoles.some((allowedRole) => allowedRole === role)
}
