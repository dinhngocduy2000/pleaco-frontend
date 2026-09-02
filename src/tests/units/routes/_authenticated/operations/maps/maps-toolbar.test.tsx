import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

const navigate = vi.hoisted(() => vi.fn())
const search = vi.hoisted(() => ({
  page: 2,
  search: 'lobby',
  status: 'ASSIGNED',
  tag_ids: ['tag-1'],
  order_direction: 'DESC',
}))

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))
vi.mock('@/routes/_authenticated/operations/maps', () => ({
  Route: { fullPath: '/operations/maps', useSearch: () => search },
}))
vi.mock('@/hooks/use-debounce', () => ({ useDebounce: (value: string) => value }))
vi.mock('@/queries/use-tags-query', () => ({
  useTagsQuery: () => ({ data: { data: [{ id: 'tag-1', name: 'Lobby' }] } }),
}))
vi.mock('@/components/reusable/app-select-component/app-select-component', () => ({
  AppSelectComponent: ({
    multiple,
    onChange,
    placeholder,
  }: {
    multiple?: boolean
    onChange: (value: { value: string } | { value: string }[]) => void
    placeholder: string
  }) => (
    <button
      onClick={() => onChange(multiple ? [{ value: 'tag-1' }] : { value: 'UNASSIGNED' })}
      type="button"
    >
      {placeholder}
    </button>
  ),
}))
vi.mock('@/components/reusable/app-dropdown-menu/dropdown-menu', () => ({
  default: ({ items }: { items: { label: string; onClick: () => void }[] }) => (
    <div>
      {items.map((item) => (
        <button key={item.label} onClick={item.onClick} type="button">
          {item.label}
        </button>
      ))}
    </div>
  ),
}))
vi.mock('@/components/reusable/app-dialog/app-dialog-component', () => ({
  default: ({ children, open }: React.PropsWithChildren<{ open: boolean }>) =>
    open ? <div>{children}</div> : null,
}))
vi.mock('@/routes/_authenticated/operations/components/maps/-map-create-modal', () => ({
  MapCreateModal: () => <div>Create map modal</div>,
}))
vi.mock('@/lib/translation', () => ({
  getTranslations: () => ({
    maps_filter_all: () => 'All',
    maps_status_assigned: () => 'Assigned',
    maps_status_unassigned: () => 'Unassigned',
    maps_search_placeholder: () => 'Search maps',
    maps_filter_placeholder: () => 'Status',
    maps_tags_placeholder: () => 'Tags',
    maps_sort_ascending: () => 'Oldest first',
    maps_sort_descending: () => 'Newest first',
    map_create_trigger: () => 'Create map',
    map_create_title: () => 'Create map',
  }),
}))

import { MapsToolbar } from '@/routes/_authenticated/operations/components/maps/-maps-toolbar'

describe('MapsToolbar', () => {
  it('updates status, tags, and ordering filters through URL search state', async () => {
    const user = userEvent.setup()
    render(<MapsToolbar />)

    await user.click(screen.getByRole('button', { name: 'Status' }))
    expect(navigate.mock.calls[0][0].search({ page: 2, search: 'lobby' })).toEqual({
      page: 1,
      search: 'lobby',
      status: 'UNASSIGNED',
    })

    await user.click(screen.getByRole('button', { name: 'Tags' }))
    expect(navigate.mock.calls[1][0].search({ page: 2, tag_ids: undefined })).toEqual({
      page: 1,
      tag_ids: ['tag-1'],
    })

    await user.click(screen.getByRole('button', { name: 'Oldest first' }))
    expect(navigate.mock.calls[2][0].search({ page: 2, order_direction: 'DESC' })).toEqual({
      page: 1,
      order_direction: 'asc',
    })
  })

  it('opens the map creation dialog', async () => {
    const user = userEvent.setup()
    render(<MapsToolbar />)

    await user.click(screen.getByRole('button', { name: 'Create map' }))
    expect(screen.getByText('Create map modal')).toBeInTheDocument()
  })
})
