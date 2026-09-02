import { render, screen } from '@testing-library/react'
import { Suspense } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { KEY_STORAGE } from '@/enum/key-storage'

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate-to">{to}</div>,
    createFileRoute: () => (options: Record<string, unknown>) => options,
  }
})

import { Route } from '@/routes/_redirect/redirect'

const renderRedirect = () =>
  render(
    <Suspense fallback={null}>
      <Route.component />
    </Suspense>,
  )

describe('authentication redirect route', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.clear()
    await (Route.component as unknown as { preload: () => Promise<void> }).preload()
  })

  it('marks the session as saved and authenticated before redirecting home', () => {
    renderRedirect()

    expect(localStorage.getItem(KEY_STORAGE.IS_SAVE_SESSION)).toBe('true')
    expect(localStorage.getItem(KEY_STORAGE.IS_LOGGED_IN)).toBe('true')
    expect(screen.getByTestId('navigate-to')).toHaveTextContent('/')
  })
})
