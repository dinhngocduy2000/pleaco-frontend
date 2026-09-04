import { describe, expect, it } from 'vitest'
import { GroupRole } from '@/enum/group'
import { hasRoleAccess } from '@/lib/role-access'

const ownerAndAdminRoles = [GroupRole.OWNER, GroupRole.ADMIN]

describe('hasRoleAccess', () => {
  it('allows a role that is included in the permitted roles', () => {
    expect(hasRoleAccess(GroupRole.OWNER, ownerAndAdminRoles)).toBe(true)
    expect(hasRoleAccess(GroupRole.ADMIN, ownerAndAdminRoles)).toBe(true)
  })

  it('denies a valid role that is not included in the permitted roles', () => {
    expect(hasRoleAccess(GroupRole.MEMBER, ownerAndAdminRoles)).toBe(false)
  })

  it('fails closed for missing or unknown roles', () => {
    expect(hasRoleAccess(undefined, ownerAndAdminRoles)).toBe(false)
    expect(hasRoleAccess(null, ownerAndAdminRoles)).toBe(false)
    expect(hasRoleAccess('unknown-role', ownerAndAdminRoles)).toBe(false)
  })
})
