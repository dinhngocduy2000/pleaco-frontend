import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { KEY_STORAGE } from '@/enum/key-storage'
import { UserStatus } from '@/enum/users'

const hooks = vi.hoisted(() => ({
  useProfileQuery: vi.fn(),
  useTrackSessionQuery: vi.fn(),
  useAcceptGroupInvitationMutation: vi.fn(),
  useGetGroupInvitationQuery: vi.fn(),
  useListGroupKeyValueQuery: vi.fn(),
  useChangeActiveGroupMutation: vi.fn(),
}))
const selectProps = vi.hoisted(() => vi.fn())
vi.mock('@/queries/use-auth-query', () => ({
  useProfileQuery: hooks.useProfileQuery,
  useTrackSessionQuery: hooks.useTrackSessionQuery,
}))
vi.mock('@/queries/use-groups-query', () => ({
  useAcceptGroupInvitationMutation: hooks.useAcceptGroupInvitationMutation,
  useGetGroupInvitationQuery: hooks.useGetGroupInvitationQuery,
  useListGroupKeyValueQuery: hooks.useListGroupKeyValueQuery,
  useChangeActiveGroupMutation: hooks.useChangeActiveGroupMutation,
}))
vi.mock('@/components/reusable/app-dialog/app-dialog-component', () => ({
  default: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div role="dialog">{children}</div> : null,
}))
vi.mock('@/components/layouts/site_header/create-group-dialog/create-group-dialog', () => ({
  default: () => <div>Create group form</div>,
}))
vi.mock('@/components/layouts/profile_dropdown_component', () => ({
  ProfileDropdownComponent: () => <div>Profile menu</div>,
}))
vi.mock('@/components/ui/sidebar', () => ({
  SidebarTrigger: () => <button type="button">Toggle sidebar</button>,
}))
vi.mock('@/components/ui/separator', () => ({ Separator: () => <hr /> }))
vi.mock('@/components/reusable/app-select-component/app-select-component', () => ({
  AppSelectComponent: (props: unknown) => {
    selectProps(props)
    return <button type="button">Select team</button>
  },
}))
vi.mock('@/lib/translation', () => ({
  getTranslations: () => ({
    group_invitation_accept: () => 'Accepted',
    create_group_welcome_title: () => 'Welcome',
    group_invitation_prefix: () => 'Join ',
    group_invitation_as: () => ' as ',
    group_invitation_suffix: () => '.',
  }),
}))

import GroupInvitationModal from '@/components/layouts/site_header/group-invitation-modal/group-invitaiton.modal'
import SelectGroupDropdown from '@/components/layouts/site_header/select-group-dropdown/select-group-dropdown'
import { SiteHeader } from '@/components/layouts/site_header/site_header'

describe('site header features', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hooks.useGetGroupInvitationQuery.mockReturnValue({ data: undefined })
    hooks.useListGroupKeyValueQuery.mockReturnValue({ data: undefined })
    hooks.useChangeActiveGroupMutation.mockReturnValue({ mutateAsync: vi.fn() })
  })

  it('opens the create-group dialog for a pending user', () => {
    hooks.useProfileQuery.mockReturnValue({ data: { data: { status: UserStatus.PENDING } } })
    hooks.useTrackSessionQuery.mockReturnValue({})
    hooks.useAcceptGroupInvitationMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    })
    render(<SiteHeader />)
    expect(screen.getByRole('dialog')).toHaveTextContent('Create group form')
  })

  it('opens the invitation dialog when an invitation is stored', () => {
    localStorage.setItem(KEY_STORAGE.INVITATION_ID, 'invite-1')
    hooks.useProfileQuery.mockReturnValue({ data: { data: { group_id: 'group-1' } } })
    hooks.useTrackSessionQuery.mockReturnValue({})
    hooks.useAcceptGroupInvitationMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    })
    render(<SiteHeader />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    localStorage.clear()
  })

  it('renders invitation details returned by the invitation query', () => {
    hooks.useGetGroupInvitationQuery.mockReturnValue({
      data: { data: { group_name: 'Operations', role: 'ADMIN' } },
    })
    render(<GroupInvitationModal />)
    expect(screen.getByText(/Operations/)).toBeInTheDocument()
    expect(screen.getByText(/ADMIN/)).toBeInTheDocument()
  })

  it('maps active groups to searchable select options', () => {
    hooks.useProfileQuery.mockReturnValue({
      data: { data: { group_id: 'group-1', group: { label: 'Operations', value: 'group-1' } } },
    })
    hooks.useListGroupKeyValueQuery.mockReturnValue({
      data: { data: [{ label: 'Operations', value: 'group-1' }] },
    })
    hooks.useChangeActiveGroupMutation.mockReturnValue({ mutateAsync: vi.fn() })
    render(<SelectGroupDropdown />)
    expect(selectProps).toHaveBeenCalledWith(
      expect.objectContaining({
        searchable: true,
        options: [expect.objectContaining({ subLabel: 'GRP-group' })],
      }),
    )
  })
})
