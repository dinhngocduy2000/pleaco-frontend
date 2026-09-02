import { describe, expect, it } from 'vitest'
import { GroupRole } from '@/enum/group'
import { updateGroupMemberFormSchema } from '@/schemas/group-schemas'

describe('updateGroupMemberFormSchema', () => {
  it('accepts a group role', () => {
    const schema = updateGroupMemberFormSchema()

    expect(schema.safeParse({ role: GroupRole.ADMIN }).success).toBe(true)
  })

  it('requires a role', () => {
    const schema = updateGroupMemberFormSchema()

    expect(schema.safeParse({ role: '' }).success).toBe(false)
  })
})
