import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { GeometryType, MapBoundarySource } from '@/enum/maps'
import type { IMapBoundaryCoordinate } from '@/interface/maps'

const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }))
const saveMapBoundaries = vi.hoisted(() => vi.fn())
const useSaveMapBoundariesMutation = vi.hoisted(() => vi.fn())
vi.mock('sonner', () => ({ toast }))
vi.mock('@/queries/use-maps-query', () => ({ useSaveMapBoundariesMutation }))
vi.mock('@/routes/_authenticated/operations/components/maps/-map-boundary-editor', () => ({
  MapBoundaryEditor: ({
    closed,
    interactive,
    onChange,
    onInvalid,
    points,
  }: {
    closed: boolean
    interactive: boolean
    onChange: (points: IMapBoundaryCoordinate[], closed: boolean) => void
    onInvalid: () => void
    points: IMapBoundaryCoordinate[]
  }) => (
    <div data-testid="boundary-editor" data-closed={closed} data-points={points.length}>
      <span>{interactive ? 'Interactive editor' : 'Read-only editor'}</span>
      <button
        type="button"
        onClick={() =>
          onChange(
            [
              [1.234, 1.236],
              [8.888, 1],
              [4, 7.777],
            ],
            true,
          )
        }
      >
        Draw valid boundary
      </button>
      <button type="button" onClick={onInvalid}>
        Draw invalid boundary
      </button>
    </div>
  ),
}))

import { MapBoundaryStep } from '@/routes/_authenticated/operations/components/maps/-map-boundary-step'

const map = {
  id: 'map-123',
  name: 'Warehouse',
  description: null,
  status: 'UNASSIGNED' as const,
  tags: [],
  dimension_x: 20,
  dimension_y: 12,
  updated_at: '2026-09-05T00:00:00.000Z',
}

beforeAll(() => {
  globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })) as unknown as typeof ResizeObserver
  globalThis.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })) as unknown as typeof IntersectionObserver
  Element.prototype.scrollIntoView = vi.fn()
})

describe('MapBoundaryStep', () => {
  beforeEach(() => {
    toast.error.mockReset()
    toast.success.mockReset()
    saveMapBoundaries.mockReset()
    useSaveMapBoundariesMutation.mockImplementation(({ onSuccess }) => ({
      isPending: false,
      mutate: (payload: unknown) => {
        saveMapBoundaries(payload)
        onSuccess?.()
      },
    }))
  })

  it('defaults to the full map area and keeps Teach mode disabled', async () => {
    const user = userEvent.setup()
    render(<MapBoundaryStep map={map} onClose={vi.fn()} />)

    expect(screen.getByRole('combobox', { name: 'Boundary method' })).toHaveTextContent(
      'Use full map area',
    )
    expect(screen.getByText('Read-only editor')).toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: 'Boundary method' }))
    expect(screen.getByRole('option', { name: /Teach mode/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })

  it('saves the dimensions source without geometry before closing', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<MapBoundaryStep map={map} onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(saveMapBoundaries).toHaveBeenCalledWith({
      map_id: 'map-123',
      source: MapBoundarySource.DIMENSIONS,
    })
    expect(toast.success).toHaveBeenCalledWith('Boundary saved successfully.')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('requires a valid closed custom polygon and rounds its coordinates', async () => {
    const user = userEvent.setup()
    render(<MapBoundaryStep map={map} onClose={vi.fn()} />)

    await user.click(screen.getByRole('combobox', { name: 'Boundary method' }))
    await user.click(screen.getByRole('option', { name: 'Draw a custom boundary' }))
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Draw valid boundary' }))
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(saveMapBoundaries).toHaveBeenCalledWith({
      map_id: 'map-123',
      source: MapBoundarySource.CUSTOM,
      geometry: {
        type: GeometryType.POLYGON,
        coordinates: [
          [
            [1.23, 1.24],
            [8.89, 1],
            [4, 7.78],
            [1.23, 1.24],
          ],
        ],
      },
    })
  })

  it('supports undo, clear, invalid feedback, and clears Custom when switching modes', async () => {
    const user = userEvent.setup()
    render(<MapBoundaryStep map={map} onClose={vi.fn()} />)

    await user.click(screen.getByRole('combobox', { name: 'Boundary method' }))
    await user.click(screen.getByRole('option', { name: 'Draw a custom boundary' }))
    await user.click(screen.getByRole('button', { name: 'Draw invalid boundary' }))
    expect(screen.getByText(/Boundary lines cannot cross/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Draw valid boundary' }))
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.getByTestId('boundary-editor')).toHaveAttribute('data-points', '3')
    expect(screen.getByTestId('boundary-editor')).toHaveAttribute('data-closed', 'false')
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(screen.getByTestId('boundary-editor')).toHaveAttribute('data-points', '0')

    await user.click(screen.getByRole('button', { name: 'Draw valid boundary' }))
    await user.click(screen.getByRole('combobox', { name: 'Boundary method' }))
    await user.click(screen.getByRole('option', { name: 'Use full map area' }))
    await user.click(screen.getByRole('combobox', { name: 'Boundary method' }))
    await user.click(screen.getByRole('option', { name: 'Draw a custom boundary' }))
    expect(screen.getByTestId('boundary-editor')).toHaveAttribute('data-points', '0')
  })

  it('closes without saving when Maybe later is selected', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<MapBoundaryStep map={map} onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'Maybe later' }))

    expect(saveMapBoundaries).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows the API detail and keeps the boundary step open when saving fails', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    useSaveMapBoundariesMutation.mockImplementation(({ onError }) => ({
      isPending: false,
      mutate: () =>
        onError?.({ response: { data: { detail: 'Boundary service is unavailable' } } }),
    }))
    render(<MapBoundaryStep map={map} onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(toast.error).toHaveBeenCalledWith('Boundary service is unavailable')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('uses the localized fallback when the API has no error detail', async () => {
    const user = userEvent.setup()
    useSaveMapBoundariesMutation.mockImplementation(({ onError }) => {
      return { isPending: false, mutate: () => onError?.(new Error('Unavailable')) }
    })
    render(<MapBoundaryStep map={map} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(toast.error).toHaveBeenCalledWith('Unable to save the boundary. Please try again.')
  })

  it('disables actions while saving', () => {
    useSaveMapBoundariesMutation.mockReturnValue({
      isPending: true,
      mutate: saveMapBoundaries,
    })
    render(<MapBoundaryStep map={map} onClose={vi.fn()} />)

    expect(screen.getByRole('combobox', { name: 'Boundary method' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Maybe later' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /^Save/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled()
  })
})
