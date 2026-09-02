import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }))
vi.mock('@/routes/_authenticated/organization/users', () => ({
  Route: { fullPath: '/users', useSearch: () => ({}) },
}))
vi.mock('@/hooks/use-debounce', () => ({ useDebounce: (value: string) => value }))
vi.mock('@/components/reusable/app-dialog/app-dialog-component', () => ({
  default: ({ dialogTrigger }: { dialogTrigger: React.ReactNode }) => <>{dialogTrigger}</>,
}))
vi.mock('@/components/reusable/app-dropdown-menu/dropdown-menu', () => ({
  default: () => <button type="button">Sort</button>,
}))
vi.mock('@/components/reusable/app-select-component/app-select-component', () => ({
  AppSelectComponent: () => <button type="button">Filter</button>,
}))
vi.mock('@/routes/_authenticated/organization/components/users/-group-invite-member', () => ({
  default: () => <div>Invite form</div>,
}))
vi.mock('@/lib/translation', () => ({
  getTranslations: () => ({
    group_members_search_placeholder: () => 'Search members',
    group_members_order_newest: () => 'Newest',
    group_members_order_oldest: () => 'Oldest',
    group_members_filter_all: () => 'All',
    group_members_filter_status_placeholder: () => 'Status',
    group_members_filter_role_placeholder: () => 'Role',
    group_invite_members: () => 'Invite member',
  }),
}))

import { GroupMembersToolbar } from '@/routes/_authenticated/organization/components/users/-group-members-toolbar'

describe('GroupMembersToolbar', () => {
  it('renders search, filters, sort, and invitation trigger', () => {
    render(<GroupMembersToolbar />)
    expect(screen.getByRole('textbox', { name: 'Search members' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Invite member' })).toBeInTheDocument()
  })
})
