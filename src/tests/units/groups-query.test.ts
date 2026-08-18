import { describe, expect, it } from 'vitest'
import { GROUPS_ENDPOINTS } from '@/enum/endpoints'
import { GroupMemberOrderBy, GroupMemberOrderDirection } from '@/enum/group'
import { getGroupMembersQueryKey } from '@/queries/use-groups-query'

describe('getGroupMembersQueryKey', () => {
  it('includes every server-side pagination and filter parameter', () => {
    const params = {
      group_id: 'group-123',
      page: 2,
      page_size: 10,
      order_by: GroupMemberOrderBy.JOINED_DATE,
      order_direction: GroupMemberOrderDirection.ASC,
      email: 'member@example.com',
      role: 'admin',
      status: 'ACTIVE',
    }

    expect(getGroupMembersQueryKey(params)).toEqual([GROUPS_ENDPOINTS.LIST_MEMBERS, params])
  })
})
