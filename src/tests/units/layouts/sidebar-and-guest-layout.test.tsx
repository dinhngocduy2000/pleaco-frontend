import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ROUTES } from '@/enum/routes'

const location = vi.hoisted(() => ({ pathname: '' }))
vi.mock('@tanstack/react-router', () => ({ useLocation: () => location }))
vi.mock('@/lib/translation', () => ({
  getTranslations: () => ({
    login_title: () => 'Welcome back',
    login_description: () => 'Sign in',
    register_title: () => 'Create account',
    register_description: () => 'Start here',
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

import { getNavGroups, isRouteActive } from '@/components/layouts/app_sidebar/sidebar_item'
import { GuestLayout } from '@/components/layouts/guest_layout/guest_layout'

describe('layout navigation and guest shell', () => {
  it('creates role-aware navigation groups and detects exact or nested routes', () => {
    expect(getNavGroups()).toHaveLength(4)
    expect(getNavGroups()[0]?.items.map((item) => item.url)).toContain(ROUTES.MAPS)
    expect(isRouteActive('/operations/maps/123', ROUTES.MAPS)).toBe(true)
    expect(isRouteActive(ROUTES.ROBOTS, ROUTES.MAPS)).toBe(false)
  })

  it('renders the login header and page content', () => {
    location.pathname = ROUTES.LOGIN
    render(
      <GuestLayout>
        <p>Login form</p>
      </GuestLayout>,
    )
    expect(screen.getByTestId('login_title')).toHaveTextContent('Welcome back')
    expect(screen.getByText('Login form')).toBeInTheDocument()
  })

  it('renders the register header for the registration route', () => {
    location.pathname = ROUTES.REGISTER
    render(
      <GuestLayout>
        <p>Register form</p>
      </GuestLayout>,
    )
    expect(screen.getByTestId('register_title')).toHaveTextContent('Create account')
    expect(screen.getByTestId('register_description')).toHaveTextContent('Start here')
  })
})
