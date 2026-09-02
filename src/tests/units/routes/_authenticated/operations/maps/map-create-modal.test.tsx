import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Dispatch, ReactNode, SetStateAction } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }))
const useProfileQuery = vi.hoisted(() => vi.fn())
const useTagsQuery = vi.hoisted(() => vi.fn())
const useRobotsKeyValueQuery = vi.hoisted(() => vi.fn())
const useCreateMapMutation = vi.hoisted(() => vi.fn())
const mutateAsync = vi.hoisted(() => vi.fn())

vi.mock('sonner', () => ({ toast }))
vi.mock('@/queries/use-auth-query', () => ({ useProfileQuery }))
vi.mock('@/queries/use-tags-query', () => ({ useTagsQuery }))
vi.mock('@/queries/use-robots-query', () => ({ useRobotsKeyValueQuery }))
vi.mock('@/queries/use-maps-query', () => ({ useCreateMapMutation }))
vi.mock('react-konva', () => ({
  Circle: () => null,
  Layer: ({ children }: { children: ReactNode }) => <>{children}</>,
  Line: () => null,
  Rect: () => null,
  Stage: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

import { MapCreateModal } from '@/routes/_authenticated/operations/components/maps/-map-create-modal'

const setOpen = vi.fn() as Dispatch<SetStateAction<boolean>>

const fillRequiredFields = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText(/Map name/), 'Warehouse')
  await user.type(screen.getByLabelText(/Width/), '20')
  await user.type(screen.getByLabelText(/Height/), '12')
}

describe('MapCreateModal', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
    setOpen.mockReset()
    mutateAsync.mockReset()
    toast.error.mockReset()
    toast.success.mockReset()
    useProfileQuery.mockReturnValue({ data: { data: { group_id: 'group-123' } } })
    useTagsQuery.mockReturnValue({
      data: { data: [{ id: '00000000-0000-4000-8000-000000000001', name: 'Warehouse' }] },
    })
    useRobotsKeyValueQuery.mockReturnValue({
      data: {
        data: [
          {
            value: '00000000-0000-4000-8000-000000000011',
            label: 'Milo',
            serial_num: 'PL-2026-0042',
          },
          {
            value: '00000000-0000-4000-8000-000000000012',
            label: 'Nova',
            serial_num: 'PL-2026-0043',
          },
        ],
      },
    })
    useCreateMapMutation.mockReturnValue({ isPending: false, mutateAsync })
  })

  it('validates required positive dimensions', async () => {
    const { container } = render(<MapCreateModal setOpen={setOpen} />)

    fireEvent.submit(container.querySelector('form') as HTMLFormElement)

    expect(await screen.findByText('Map name is required')).toBeInTheDocument()
    expect(await screen.findAllByText('A dimension is required')).toHaveLength(2)
  })

  it('submits selected tag IDs, empty robot IDs, and closes after success', async () => {
    useCreateMapMutation.mockImplementation(({ onSuccess }) => ({
      isPending: false,
      mutateAsync: async (payload: unknown) => {
        mutateAsync(payload)
        onSuccess()
      },
    }))
    const user = userEvent.setup()
    render(<MapCreateModal setOpen={setOpen} />)

    await fillRequiredFields(user)
    await user.click(screen.getAllByTestId('select-trigger')[1])
    await user.click(screen.getByTestId('select-item-00000000-0000-4000-8000-000000000001'))
    await user.click(screen.getByRole('button', { name: 'Create map' }))

    expect(mutateAsync).toHaveBeenCalledWith({
      group_id: 'group-123',
      name: 'Warehouse',
      description: undefined,
      dimension_x: 20,
      dimension_y: 12,
      robot_ids: [],
      tags: ['00000000-0000-4000-8000-000000000001'],
    })
    expect(toast.success).toHaveBeenCalledWith('Map created successfully.')
    expect(setOpen).toHaveBeenCalledWith(false)
  })

  it('filters bots by name or serial number and submits selected robot IDs', async () => {
    const user = userEvent.setup()
    useCreateMapMutation.mockImplementation(({ onSuccess }) => ({
      isPending: false,
      mutateAsync: async (payload: unknown) => {
        mutateAsync(payload)
        onSuccess()
      },
    }))
    render(<MapCreateModal setOpen={setOpen} />)

    await fillRequiredFields(user)
    await user.click(screen.getAllByTestId('select-trigger')[0])
    await user.type(screen.getByTestId('select-search-input'), '0043')

    expect(
      await screen.findByTestId('select-item-00000000-0000-4000-8000-000000000012'),
    ).toBeVisible()
    await waitFor(() => {
      expect(screen.queryByTestId('select-item-00000000-0000-4000-8000-000000000011')).toBeNull()
    })

    await user.click(screen.getByTestId('select-item-00000000-0000-4000-8000-000000000012'))
    await user.clear(screen.getByTestId('select-search-input'))
    await user.click(await screen.findByTestId('select-item-00000000-0000-4000-8000-000000000011'))
    await user.click(screen.getByRole('button', { name: 'Create map' }))

    expect(mutateAsync).toHaveBeenCalledWith({
      group_id: 'group-123',
      name: 'Warehouse',
      description: undefined,
      dimension_x: 20,
      dimension_y: 12,
      robot_ids: ['00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000011'],
      tags: [],
    })
  })

  it('shows an error and leaves the modal open when creation fails', async () => {
    useCreateMapMutation.mockImplementation(({ onError }) => ({
      isPending: false,
      mutateAsync: async () =>
        onError({ response: { data: { detail: 'Map name already exists' } } }),
    }))
    const user = userEvent.setup()
    render(<MapCreateModal setOpen={setOpen} />)

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: 'Create map' }))

    expect(toast.error).toHaveBeenCalledWith('Map name already exists')
    expect(setOpen).not.toHaveBeenCalled()
  })

  it('blocks submission without an active group', async () => {
    useProfileQuery.mockReturnValue({ data: { data: { group_id: undefined } } })
    const user = userEvent.setup()
    render(<MapCreateModal setOpen={setOpen} />)

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: 'Create map' }))

    expect(mutateAsync).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Select an active group before creating a map.')
  })
})
