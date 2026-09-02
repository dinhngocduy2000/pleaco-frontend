import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GroupRole, INVITATION_STATUS } from '@/enum/group'

vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }))
vi.mock('@/queries/use-auth-query', () => ({
  useProfileQuery: () => ({ data: { data: { id: 'owner' } } }),
}))
vi.mock('@/queries/use-groups-query', () => ({
  useDeleteMemberMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@/components/reusable/alert-dialog/app-alert-dialog', () => ({ default: () => null }))
vi.mock('@/components/reusable/app-dialog/app-dialog-component', () => ({ default: () => null }))
vi.mock('@/routes/_authenticated/organization/components/users/-group-edit-member', () => ({
  default: () => null,
}))
vi.mock('@/lib/translation', () => ({
  getTranslations: () => ({
    group_members_edit: () => 'Edit',
    group_members_delete_coming_soon: () => 'Delete',
    group_delete_member_description: () => '',
    group_edit_member_title: () => '',
    group_delete_member_success: () => '',
    group_members_invitation_accepted: () => 'Accepted',
  }),
  getCurrentLanguage: () => 'en',
}))

import GroupMembersTableRowComponent from '@/routes/_authenticated/organization/components/users/-group-members-table.row'

describe('GroupMembersTableRowComponent', () => {
  it('renders a member and its accepted invitation state', () => {
    render(
      <table>
        <tbody>
          <GroupMembersTableRowComponent
            index={1}
            groupId="g1"
            member={{
              member_id: 'm1',
              name: 'Jane Doe',
              email: 'jane@example.com',
              image_url: null,
              joined_at: '2026-01-01',
              role: GroupRole.MEMBER,
              status: 'ACTIVE',
              invitation_status: INVITATION_STATUS.ACCEPTED,
            }}
          />
        </tbody>
      </table>,
    )
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })
})
