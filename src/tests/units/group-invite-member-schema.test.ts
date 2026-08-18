import { describe, expect, it } from 'vitest'
import { GroupRole } from '@/enum/group'
import { inviteGroupMemberFormSchema } from '@/schemas/group-schemas'

describe('inviteGroupMemberFormSchema', () => {
  it('requires a valid email address', () => {
    const schema = inviteGroupMemberFormSchema()

    expect(schema.safeParse({ email: '', role: GroupRole.MEMBER }).success).toBe(false)
    expect(schema.safeParse({ email: 'invalid-email', role: GroupRole.MEMBER }).success).toBe(false)
  })

  it('accepts a trimmed email and a group role', () => {
    const schema = inviteGroupMemberFormSchema()
    const result = schema.safeParse({ email: ' member@example.com ', role: GroupRole.MEMBER })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({ email: 'member@example.com', role: GroupRole.MEMBER })
    }
  })
})
