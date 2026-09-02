import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Footer } from '@/components/layouts/footer'
import { RouteLoadingFallback } from '@/components/layouts/route_loading_fallback'

describe('shared layouts', () => {
  it('renders the current copyright year', () => {
    render(<Footer />)
    expect(screen.getByText(new RegExp(`${new Date().getFullYear()} Pleaco`))).toBeInTheDocument()
  })

  it('renders an accessible loading fallback', () => {
    render(<RouteLoadingFallback />)
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })
})
