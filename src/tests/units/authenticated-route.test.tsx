import { render, screen } from '@testing-library/react'
import { Suspense } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { KEY_STORAGE } from '@/enum/key-storage'

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    createFileRoute: () => (options: Record<string, unknown>) => options,
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate-to">{to}</div>,
    Outlet: () => <div>Protected route content</div>,
  }
})
vi.mock('@/components/layouts/auth_layout', () => ({
  AuthLayout: ({ children }: React.PropsWithChildren) => (
    <main data-testid="auth-layout">{children}</main>
  ),
}))

import { Route } from '@/routes/_authenticated'

const renderAuthenticatedRoute = () =>
  render(
    <Suspense fallback={null}>
      <Route.component />
    </Suspense>,
  )

describe('authenticated route layout', () => {
  beforeEach(async () => {
    localStorage.clear()
    await (Route.component as unknown as { preload: () => Promise<void> }).preload()
  })

  it('redirects unauthenticated visitors to login', () => {
    renderAuthenticatedRoute()

    expect(screen.getByTestId('navigate-to')).toHaveTextContent('/login')
    expect(screen.queryByTestId('auth-layout')).not.toBeInTheDocument()
  })

  it('renders the authenticated layout and child route for signed-in visitors', () => {
    localStorage.setItem(KEY_STORAGE.IS_LOGGED_IN, 'true')
    renderAuthenticatedRoute()

    expect(screen.getByTestId('auth-layout')).toHaveTextContent('Protected route content')
  })
})
