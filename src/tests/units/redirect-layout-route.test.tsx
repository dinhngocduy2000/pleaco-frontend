import { render, screen } from '@testing-library/react'
import { Suspense } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    createFileRoute: () => (options: Record<string, unknown>) => options,
    Outlet: () => <div>Redirect child route content</div>,
  }
})

import { Route } from '@/routes/_redirect'

const renderRedirectLayout = () =>
  render(
    <Suspense fallback={null}>
      <Route.component />
    </Suspense>,
  )

describe('redirect route layout', () => {
  beforeEach(async () => {
    await (Route.component as unknown as { preload?: () => Promise<void> }).preload?.()
  })

  it('renders its nested redirect route through the outlet', () => {
    renderRedirectLayout()

    expect(screen.getByText('Redirect child route content')).toBeInTheDocument()
  })
})
