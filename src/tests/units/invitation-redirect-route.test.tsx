import { render, screen } from '@testing-library/react'
import { Suspense } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { KEY_STORAGE } from '@/enum/key-storage'

const search = vi.hoisted(() => ({ invitation_id: 'invitation-42' as string | undefined }))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate-to">{to}</div>,
    createFileRoute: () => (options: Record<string, unknown>) => ({
      ...options,
      useSearch: () => search,
    }),
  }
})

import { Route } from '@/routes/_redirect/invitation'

const renderInvitationRedirect = () =>
  render(
    <Suspense fallback={null}>
      <Route.component />
    </Suspense>,
  )

describe('invitation redirect route', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.clear()
    search.invitation_id = 'invitation-42'
    await (Route.component as unknown as { preload: () => Promise<void> }).preload()
  })

  it('persists the invitation ID and redirects to the home route', () => {
    renderInvitationRedirect()

    expect(localStorage.getItem(KEY_STORAGE.INVITATION_ID)).toBe('invitation-42')
    expect(screen.getByTestId('navigate-to')).toHaveTextContent('/')
  })

  it('clears the stored invitation ID when the search parameter is missing', () => {
    search.invitation_id = undefined
    renderInvitationRedirect()

    expect(localStorage.getItem(KEY_STORAGE.INVITATION_ID)).toBe('')
  })
})
