import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GroupRole } from '@/enum/group'
import { ROUTES } from '@/enum/routes'

const location = vi.hoisted(() => ({ pathname: '/' }))
const profile = vi.hoisted(() => ({
  data: undefined as { data: { group?: { role?: string } } } | undefined,
}))
const sidebar = vi.hoisted(() => ({ state: 'expanded' as 'collapsed' | 'expanded' }))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useLocation: () => location,
}))
vi.mock('@/queries/use-auth-query', () => ({ useProfileQuery: () => profile }))
vi.mock('@/assets/svgs/app-logo-horizontal-negative', () => ({
  default: () => <span>Wide logo</span>,
}))
vi.mock('@/assets/svgs/app-logo-without-text', () => ({ default: () => <span>Compact logo</span> }))
vi.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  CollapsibleContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  CollapsibleTrigger: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}))
vi.mock('@/components/ui/sidebar', () => ({
  Sidebar: ({ children }: React.PropsWithChildren) => <aside>{children}</aside>,
  SidebarContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  SidebarGroup: ({ children }: React.PropsWithChildren) => <section>{children}</section>,
  SidebarHeader: ({ children }: React.PropsWithChildren) => <header>{children}</header>,
  SidebarMenu: ({ children }: React.PropsWithChildren) => <ul>{children}</ul>,
  SidebarMenuButton: ({ children, isActive }: React.PropsWithChildren<{ isActive?: boolean }>) => (
    <div data-active={isActive ? 'true' : 'false'}>{children}</div>
  ),
  SidebarMenuItem: ({ children }: React.PropsWithChildren) => <li>{children}</li>,
  SidebarMenuSub: ({ children }: React.PropsWithChildren) => <ul>{children}</ul>,
  SidebarMenuSubButton: ({
    children,
    isActive,
  }: React.PropsWithChildren<{ isActive?: boolean }>) => (
    <div data-active={isActive ? 'true' : 'false'}>{children}</div>
  ),
  SidebarMenuSubItem: ({ children }: React.PropsWithChildren) => <li>{children}</li>,
  SidebarRail: () => <div data-testid="sidebar-rail" />,
  useSidebar: () => sidebar,
}))
vi.mock('@/lib/translation', () => ({
  getTranslations: () => ({
    sidebar_dashboard: () => 'Dashboard',
    sidebar_operations: () => 'Operations',
    sidebar_management: () => 'Management',
    sidebar_organization: () => 'Organization',
    sidebar_maps: () => 'Maps',
    sidebar_robots: () => 'Robots',
    sidebar_cleaning_tasks: () => 'Tasks',
    sidebar_live_monitoring: () => 'Monitoring',
    sidebar_fleets: () => 'Fleets',
    sidebar_schedules: () => 'Schedules',
    sidebar_incidents: () => 'Incidents',
    sidebar_users: () => 'Users',
    sidebar_roles_permissions: () => 'Roles',
    sidebar_audit_logs: () => 'Audit logs',
    header_settings: () => 'Settings',
    group_settings: () => 'Group settings',
  }),
}))

import { AppSidebar } from '@/components/layouts/app_sidebar/app_sidebar'

describe('AppSidebar', () => {
  beforeEach(() => {
    location.pathname = ROUTES.HOME
    sidebar.state = 'expanded'
    profile.data = { data: { group: { role: GroupRole.ADMIN } } }
  })

  it('renders the role-authorized navigation groups and their links', () => {
    render(<AppSidebar />)

    expect(screen.getByText('Wide logo')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', ROUTES.HOME)
    expect(screen.getByRole('link', { name: 'Maps' })).toHaveAttribute('href', ROUTES.MAPS)
    expect(screen.getByRole('link', { name: 'Group settings' })).toHaveAttribute(
      'href',
      ROUTES.TENANT_SETTINGS,
    )
    expect(screen.getByTestId('sidebar-rail')).toBeInTheDocument()
  })

  it('marks nested navigation routes active and uses the collapsed logo', () => {
    location.pathname = `${ROUTES.MAPS}/map-1`
    sidebar.state = 'collapsed'
    render(<AppSidebar />)

    expect(screen.getByText('Compact logo')).toBeInTheDocument()
    expect(screen.getByText('Maps').closest('[data-active]')).toHaveAttribute('data-active', 'true')
    expect(screen.getByText('Dashboard').closest('[data-active]')).toHaveAttribute(
      'data-active',
      'false',
    )
  })

  it('hides administrator-only settings from non-administrator roles', () => {
    profile.data = { data: { group: { role: GroupRole.MEMBER } } }
    render(<AppSidebar />)

    expect(screen.queryByText('Settings')).not.toBeInTheDocument()
    expect(screen.queryByText('Group settings')).not.toBeInTheDocument()
    expect(screen.getByText('Operations')).toBeInTheDocument()
  })
})
