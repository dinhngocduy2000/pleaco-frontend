import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AppPagination } from '@/components/reusable/pagination/app-pagination'

describe('AppPagination', () => {
  it('does not render when there is only one page', () => {
    render(<AppPagination currentPage={1} totalPages={1} onPageChange={vi.fn()} />)

    expect(screen.queryByRole('navigation', { name: 'pagination' })).not.toBeInTheDocument()
  })

  it('renders every page without ellipses when the page count fits the compact range', () => {
    render(<AppPagination currentPage={3} totalPages={5} onPageChange={vi.fn()} />)

    for (const page of [1, 2, 3, 4, 5]) {
      expect(screen.getByRole('link', { name: page.toString() })).toBeInTheDocument()
    }

    expect(screen.getByRole('link', { name: '3' })).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByText('More pages')).not.toBeInTheDocument()
  })

  it.each([
    { currentPage: 2, expectedPages: [1, 2, 3, 8] },
    { currentPage: 7, expectedPages: [1, 6, 7, 8] },
  ])(
    'renders an ellipsis for a truncated page range at page $currentPage',
    ({ currentPage, expectedPages }) => {
      render(<AppPagination currentPage={currentPage} totalPages={8} onPageChange={vi.fn()} />)

      for (const page of expectedPages) {
        expect(screen.getByRole('link', { name: page.toString() })).toBeInTheDocument()
      }

      expect(screen.getByRole('link', { name: currentPage.toString() })).toHaveAttribute(
        'aria-current',
        'page',
      )
      expect(screen.getAllByText('More pages')).toHaveLength(1)
    },
  )

  it('changes to an adjacent or selected page while preserving page boundaries', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    render(<AppPagination currentPage={4} totalPages={8} onPageChange={onPageChange} />)

    expect(screen.getByRole('link', { name: '4' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getAllByText('More pages')).toHaveLength(2)

    await user.click(screen.getByRole('link', { name: 'Go to previous page' }))
    await user.click(screen.getByRole('link', { name: '8' }))
    await user.click(screen.getByRole('link', { name: 'Go to next page' }))

    expect(onPageChange).toHaveBeenNthCalledWith(1, 3)
    expect(onPageChange).toHaveBeenNthCalledWith(2, 8)
    expect(onPageChange).toHaveBeenNthCalledWith(3, 5)
  })

  it('disables navigation beyond the first or last page', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    render(<AppPagination currentPage={1} totalPages={2} onPageChange={onPageChange} />)

    expect(screen.getByRole('link', { name: 'Go to previous page' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    await user.click(screen.getByRole('link', { name: 'Go to next page' }))

    expect(onPageChange).toHaveBeenCalledTimes(1)
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('renders the next control as disabled on the final page', () => {
    render(<AppPagination currentPage={4} totalPages={4} onPageChange={vi.fn()} />)

    expect(screen.getByRole('link', { name: 'Go to next page' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    expect(screen.getByRole('link', { name: 'Go to previous page' })).toHaveAttribute(
      'aria-disabled',
      'false',
    )
  })
})
