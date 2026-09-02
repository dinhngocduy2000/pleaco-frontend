import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GroupRole, INVITATION_STATUS } from '@/enum/group'

vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }))
vi.mock('@/queries/use-groups-query', () => ({
  useUpdateMemberMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@/components/reusable/app-select-component/app-select-component', () => ({
  AppSelectComponent: () => <button type="button">Role</button>,
}))
vi.mock('@/components/reusable/dialog-footer/dialog-footer', () => ({
  default: ({ confirmButtonText }: { confirmButtonText: string }) => (
    <button type="button">{confirmButtonText}</button>
  ),
}))
vi.mock('@/lib/translation', () => ({
  getTranslations: () => ({
    group_invite_member_email_label: () => 'Email',
    group_invite_member_role_label: () => 'Role',
    group_invite_member_role_placeholder: () => 'Role',
    group_invite_member_cancel: () => 'Cancel',
    group_edit_member_submit: () => 'Save',
    group_edit_member_success: () => '',
    group_invite_member_role_required: () => '',
  }),
}))

import GroupEditMember from '@/routes/_authenticated/organization/components/users/-group-edit-member'

describe('GroupEditMember', () => {
  it('renders a member email and edit action', () => {
    render(
      <GroupEditMember
        groupId="g1"
        setOpen={vi.fn()}
        member={{
          member_id: 'm1',
          name: 'Jane',
          email: 'jane@example.com',
          image_url: null,
          joined_at: '2026-01-01',
          role: GroupRole.MEMBER,
          status: 'ACTIVE',
          invitation_status: INVITATION_STATUS.ACCEPTED,
        }}
      />,
    )
    expect(screen.getByDisplayValue('jane@example.com')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })
})
