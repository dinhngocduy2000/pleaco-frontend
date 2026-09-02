import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const navigate = vi.hoisted(() => vi.fn())
const profile = vi.hoisted(() => ({
  data: undefined as { data: { group_id?: string } } | undefined,
  isLoading: false,
}))
const robots = vi.hoisted(() => ({
  data: undefined as { items: { id: string; name: string }[]; total: number } | undefined,
  isError: false,
  isLoading: false,
}))
const websocket = vi.hoisted(() => vi.fn())
const useRobotsQuery = vi.hoisted(() => vi.fn(() => robots))

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))
vi.mock('@/routes/_authenticated/operations/robots', () => ({
  Route: { fullPath: '/operations/robots', useSearch: () => ({ page: 2, search: 'milo' }) },
}))
vi.mock('@/queries/use-auth-query', () => ({ useProfileQuery: () => profile }))
vi.mock('@/queries/use-robots-query', () => ({ useRobotsQuery }))
vi.mock('@/hooks/use-robot-status-websocket', () => ({ useRobotStatusWebSocket: websocket }))
vi.mock('@/components/reusable/pagination/app-pagination', () => ({
  AppPagination: ({ onPageChange }: { onPageChange: (page: number) => void }) => (
    <button onClick={() => onPageChange(3)} type="button">
      Page 3
    </button>
  ),
}))
vi.mock('@/routes/_authenticated/operations/components/robots/-bot-card-item-component', () => ({
  BotCardItemComponent: ({ robot }: { robot: { name: string } }) => <article>{robot.name}</article>,
}))
vi.mock('@/lib/translation', () => ({
  getTranslations: () => ({
    robots_loading: () => 'Loading robots',
    robots_no_active_group: () => 'No active group',
    robots_error: () => 'Could not load robots',
    robots_empty: () => 'No robots',
    robots_empty_description: () => 'Create a robot to begin.',
  }),
}))

import { RobotsList } from '@/routes/_authenticated/operations/components/robots/-robots-list'

describe('RobotsList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    profile.data = { data: { group_id: 'group-1' } }
    profile.isLoading = false
    robots.data = { items: [{ id: 'robot-1', name: 'Milo' }], total: 30 }
    robots.isError = false
    robots.isLoading = false
  })

  it('loads group-scoped robots, renders cards, and changes pages', async () => {
    const user = userEvent.setup()
    render(<RobotsList />)

    expect(useRobotsQuery).toHaveBeenCalledWith({
      enabled: true,
      params: { group_id: 'group-1', page: 2, page_size: 10, search: 'milo' },
    })
    expect(websocket).toHaveBeenCalledWith(true)
    expect(screen.getByText('Milo')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Page 3' }))
    const search = navigate.mock.calls[0][0].search
    expect(search({ search: 'milo', page: 2 })).toEqual({ search: 'milo', page: 3 })
  })

  it('renders the appropriate empty state when no active group exists', () => {
    profile.data = { data: {} }
    render(<RobotsList />)

    expect(screen.getByText('No active group')).toBeInTheDocument()
    expect(websocket).toHaveBeenCalledWith(false)
  })

  it('renders a loading state before profile or robot data is ready', () => {
    robots.isLoading = true
    render(<RobotsList />)

    expect(screen.getByText('Loading robots')).toBeInTheDocument()
  })
})
