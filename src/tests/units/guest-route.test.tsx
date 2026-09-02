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
    Outlet: () => <div>Guest route content</div>,
  }
})
vi.mock('@/components/layouts/guest_layout/guest_layout', () => ({
  GuestLayout: ({ children }: React.PropsWithChildren) => (
    <main data-testid="guest-layout">{children}</main>
  ),
}))

import { Route } from '@/routes/_guest'

const renderGuestRoute = () =>
  render(
    <Suspense fallback={null}>
      <Route.component />
    </Suspense>,
  )

describe('guest route layout', () => {
  beforeEach(async () => {
    localStorage.clear()
    await (Route.component as unknown as { preload: () => Promise<void> }).preload()
  })

  it('renders the guest layout and child route without a session', () => {
    renderGuestRoute()

    expect(screen.getByTestId('guest-layout')).toHaveTextContent('Guest route content')
  })

  it('redirects signed-in visitors to the home route', () => {
    localStorage.setItem(KEY_STORAGE.IS_LOGGED_IN, 'true')
    renderGuestRoute()

    expect(screen.getByTestId('navigate-to')).toHaveTextContent('/')
    expect(screen.queryByTestId('guest-layout')).not.toBeInTheDocument()
  })
})
