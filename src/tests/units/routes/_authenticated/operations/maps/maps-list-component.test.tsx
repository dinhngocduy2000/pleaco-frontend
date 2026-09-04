import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const navigate = vi.hoisted(() => vi.fn())
const maps = vi.hoisted(() => ({
  data: undefined as { items: { id: string; name: string }[]; total: number } | undefined,
  isError: false,
  isLoading: false,
}))
const profile = vi.hoisted(() => ({
  data: undefined as { data: { group_id?: string } } | undefined,
  isLoading: false,
}))
const useMapsQuery = vi.hoisted(() => vi.fn(() => maps))
vi.mock('@/queries/use-auth-query', () => ({ useProfileQuery: () => profile }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))
vi.mock('@/routes/_authenticated/operations/maps', () => ({
  Route: {
    fullPath: '/operations/maps',
    useSearch: () => ({
      page: 2,
      search: 'lobby',
      status: 'ASSIGNED',
      tag_ids: ['tag-1'],
      order_direction: 'DESC',
    }),
  },
}))
vi.mock('@/queries/use-maps-query', () => ({ useMapsQuery }))
vi.mock('@/components/reusable/pagination/app-pagination', () => ({
  AppPagination: ({ onPageChange }: { onPageChange: (page: number) => void }) => (
    <button onClick={() => onPageChange(3)} type="button">
      Page 3
    </button>
  ),
}))
vi.mock('@/routes/_authenticated/operations/components/maps/-map-card-item-component', () => ({
  MapCardItemComponent: ({ map }: { map: { name: string } }) => <article>{map.name}</article>,
}))
vi.mock('@/lib/translation', () => ({
  getTranslations: () => ({
    maps_loading: () => 'Loading maps',
    maps_error: () => 'Could not load maps',
    maps_empty: () => 'No maps',
    maps_empty_description: () => 'Create a map to begin.',
  }),
}))

import { MapsListComponent } from '@/routes/_authenticated/operations/components/maps/-map-list-component'

describe('MapsListComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    maps.data = { items: [{ id: 'map-1', name: 'Lobby' }], total: 30 }
    maps.isError = false
    maps.isLoading = false
    profile.data = { data: { group_id: 'test-group-id' } }
    profile.isLoading = false
  })

  it('uses URL filters, renders map cards, and changes pages', async () => {
    const user = userEvent.setup()
    render(<MapsListComponent />)

    expect(useMapsQuery).toHaveBeenCalledWith({
      params: {
        page: 2,
        page_size: 10,
        search: 'lobby',
        status: 'ASSIGNED',
        tag_ids: ['tag-1'],
        order_direction: 'DESC',
      },
      queryKey: ['test-group-id'],
    })
    expect(screen.getByText('Lobby')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Page 3' }))
    expect(navigate.mock.calls[0][0].search({ page: 2, search: 'lobby' })).toEqual({
      page: 3,
      search: 'lobby',
    })
  })

  it('renders loading and empty error states', () => {
    maps.isLoading = true
    const { rerender } = render(<MapsListComponent />)
    expect(screen.getByText('Loading maps')).toBeInTheDocument()

    maps.isLoading = false
    maps.isError = true
    rerender(<MapsListComponent />)
    expect(screen.getByText('Could not load maps')).toBeInTheDocument()
  })
})
