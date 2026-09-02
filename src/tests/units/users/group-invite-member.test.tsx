import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }))
vi.mock('@/routes/_authenticated/organization/users', () => ({
  Route: { fullPath: '/users', useSearch: () => ({ page: 1 }) },
}))
vi.mock('@/queries/use-auth-query', () => ({
  useProfileQuery: () => ({ data: { data: { group_id: 'group-1' } } }),
}))
vi.mock('@/queries/use-groups-query', () => ({
  useInviteGroupMembersMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
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
    group_invite_member_email_placeholder: () => 'member@example.com',
    group_invite_member_role_label: () => 'Role',
    group_invite_member_role_placeholder: () => 'Role',
    group_invite_member_cancel: () => 'Cancel',
    group_invite_member_submit: () => 'Invite',
    group_invite_member_success: () => '',
    group_invite_member_error: () => '',
    group_members_no_active_group: () => '',
    validation_email_required: () => '',
    validation_email_invalid: () => '',
    group_invite_member_role_required: () => '',
  }),
}))

import GroupInviteMember from '@/routes/_authenticated/organization/components/users/-group-invite-member'

describe('GroupInviteMember', () => {
  it('renders the invitation form controls', () => {
    render(<GroupInviteMember setOpen={vi.fn()} />)
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Invite' })).toBeInTheDocument()
  })
})
