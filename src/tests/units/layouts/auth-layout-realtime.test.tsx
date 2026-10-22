import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const context = vi.hoisted(() => ({
  profile: { data: { data: { group_id: 'group-1' } }, isSuccess: true },
  useGroupRobotStatusSocket: vi.fn(),
}))

vi.mock('@/components/ui/sidebar', () => ({
  SidebarInset: ({ children }: React.PropsWithChildren) => <main>{children}</main>,
  SidebarProvider: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}))
vi.mock('@/components/layouts/app_sidebar/app_sidebar', () => ({
  AppSidebar: () => <aside />,
}))
vi.mock('@/components/layouts/site_header/site_header', () => ({
  SiteHeader: () => <header />,
}))
vi.mock('@/hooks/use-robot-status-socket', () => ({
  useGroupRobotStatusSocket: context.useGroupRobotStatusSocket,
}))
vi.mock('@/queries/use-auth-query', () => ({ useProfileQuery: () => context.profile }))

import { AuthLayout } from '@/components/layouts/auth_layout'

describe('AuthLayout realtime ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    context.profile = { data: { data: { group_id: 'group-1' } }, isSuccess: true }
  })

  it('keeps the group socket enabled at the authenticated layout boundary', () => {
    render(<AuthLayout>Content</AuthLayout>)

    expect(context.useGroupRobotStatusSocket).toHaveBeenCalledWith({
      activeGroupId: 'group-1',
      enabled: true,
    })
  })

  it('does not enable the group socket until profile data is ready', () => {
    context.profile = { data: { data: { group_id: 'group-1' } }, isSuccess: false }
    render(<AuthLayout>Content</AuthLayout>)

    expect(context.useGroupRobotStatusSocket).toHaveBeenCalledWith({
      activeGroupId: 'group-1',
      enabled: false,
    })
  })
})
