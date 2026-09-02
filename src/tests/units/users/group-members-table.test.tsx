import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GroupMemberOrderDirection, GroupRole, INVITATION_STATUS } from '@/enum/group'

const profile = vi.hoisted(() => vi.fn())
const members = vi.hoisted(() => vi.fn())
vi.mock('@/queries/use-auth-query', () => ({ useProfileQuery: profile }))
vi.mock('@/queries/use-groups-query', () => ({ useGroupMembersQuery: members }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }))
vi.mock('@/routes/_authenticated/organization/users', () => ({
  Route: {
    fullPath: '/users',
    useSearch: () => ({ page: 1, order_direction: GroupMemberOrderDirection.DESC }),
  },
}))
vi.mock('@/components/reusable/pagination/app-pagination', () => ({
  AppPagination: () => <div>Pagination</div>,
}))
vi.mock('@/routes/_authenticated/organization/components/users/-group-members-table.row', () => ({
  default: ({ member, index }: { member: { email: string }; index: number }) => (
    <tr>
      <td>{index}</td>
      <td>{member.email}</td>
    </tr>
  ),
}))
vi.mock('@/lib/translation', () => ({
  getTranslations: () => ({
    group_members_loading: () => 'Loading members',
    group_members_no_active_group: () => 'No active group',
    group_members_table_index: () => '#',
    group_members_table_member: () => 'Member',
    group_members_table_role: () => 'Role',
    group_invitation_status: () => 'Invitation',
    group_members_table_joined: () => 'Joined',
    group_members_table_actions: () => 'Actions',
    group_members_error: () => 'Could not load members',
    group_members_empty: () => 'No members',
  }),
}))

import { GroupMembersTable } from '@/routes/_authenticated/organization/components/users/-group-members-table'

describe('GroupMembersTable', () => {
  beforeEach(() => vi.clearAllMocks())
  it('shows loading and no-active-group states', () => {
    profile.mockReturnValue({ data: undefined })
    members.mockReturnValue({ isLoading: true })
    const { rerender } = render(<GroupMembersTable />)
    expect(screen.getByText('Loading members')).toBeInTheDocument()
    members.mockReturnValue({ isLoading: false })
    rerender(<GroupMembersTable />)
    expect(screen.getByText('No active group')).toBeInTheDocument()
  })
  it('renders members, empty, and error table states', () => {
    profile.mockReturnValue({
      data: { data: { group_id: 'group-1', group: { role: GroupRole.ADMIN } } },
    })
    members.mockReturnValue({ isLoading: false, isError: false, data: { items: [], total: 0 } })
    const { rerender } = render(<GroupMembersTable />)
    expect(screen.getByText('No members')).toBeInTheDocument()
    members.mockReturnValue({ isLoading: false, isError: true, data: { items: [], total: 0 } })
    rerender(<GroupMembersTable />)
    expect(screen.getByText('Could not load members')).toBeInTheDocument()
    members.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        items: [
          {
            member_id: 'm1',
            email: 'member@example.com',
            name: 'Member',
            role: GroupRole.MEMBER,
            invitation_status: INVITATION_STATUS.ACCEPTED,
          },
        ],
        total: 1,
      },
    })
    rerender(<GroupMembersTable />)
    expect(screen.getByText('member@example.com')).toBeInTheDocument()
    expect(screen.getByText('Pagination')).toBeInTheDocument()
  })
})
