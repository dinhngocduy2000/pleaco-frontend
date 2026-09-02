import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BOTS_ENDPOINTS } from '@/enum/endpoints'

const navigate = vi.hoisted(() => vi.fn())
const invalidateQueries = vi.hoisted(() => vi.fn())
const search = vi.hoisted(() => ({ model: 'PRO', tag_ids: ['tag-1'], page: 2, search: 'milo' }))

vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries }) }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))
vi.mock('@/routes/_authenticated/operations/robots', () => ({
  Route: { fullPath: '/operations/robots', useSearch: () => search },
}))
vi.mock('@/hooks/use-debounce', () => ({ useDebounce: (value: string) => value }))
vi.mock('@/queries/use-tags-query', () => ({
  useTagsQuery: () => ({ data: { data: [{ id: 'tag-1', name: 'Lobby' }] } }),
}))
vi.mock('@/components/reusable/app-dialog/app-dialog-component', () => ({
  default: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}))
vi.mock('@/routes/_authenticated/operations/components/robots/-create-robot-dialog', () => ({
  CreateRobotDialog: () => <div>Create robot dialog</div>,
}))
vi.mock('@/routes/_authenticated/operations/components/robots/-robots-filter-sheet', () => ({
  RobotsFilterSheet: ({ open }: { open: boolean }) => (open ? <div>Filter sheet open</div> : null),
}))
vi.mock('@/lib/translation', () => ({
  getTranslations: () => ({
    robots_search_placeholder: () => 'Search robots',
    robots_filters_trigger: () => 'Filters',
    robot_create_trigger: () => 'Create robot',
    robot_create_title: () => 'Create robot',
  }),
}))

import { RobotsToolbar } from '@/routes/_authenticated/operations/components/robots/-robots-toolbar'

describe('RobotsToolbar', () => {
  it('renders active filters, opens the filter sheet, and removes a tag filter', async () => {
    const user = userEvent.setup()
    render(<RobotsToolbar />)

    expect(screen.getByText('Pro')).toBeInTheDocument()
    expect(screen.getByText('Lobby')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Filters' }))
    expect(screen.getByText('Filter sheet open')).toBeInTheDocument()

    const removeTag = screen.getByRole('button', { name: 'Remove Lobby filter' })
    fireEvent.click(removeTag.querySelector('svg') as SVGElement)
    const nextSearch = navigate.mock.calls.at(-1)[0].search
    expect(nextSearch({ page: 2, tag_ids: ['tag-1'], model: 'PRO' })).toEqual({
      page: 1,
      tag_ids: [],
      model: 'PRO',
    })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: [BOTS_ENDPOINTS.LIST] })
  })
})
