import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { GeometryType, MapBoundarySource, type MapZoneType } from '@/enum/maps'
import type { IMapBoundaryCoordinate } from '@/interface/maps'

const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }))
const createEnvironmentZones = vi.hoisted(() => vi.fn())
const saveMapBoundaries = vi.hoisted(() => vi.fn())
const useCreateEnvironmentZonesMutation = vi.hoisted(() => vi.fn())
const useSaveMapBoundariesMutation = vi.hoisted(() => vi.fn())
vi.mock('sonner', () => ({ toast }))
vi.mock('@/queries/use-maps-query', () => ({
  useCreateEnvironmentZonesMutation,
  useSaveMapBoundariesMutation,
}))
vi.mock('@/routes/_authenticated/operations/components/maps/-map-boundary-editor', () => ({
  MapBoundaryEditor: ({
    activeZoneType,
    canChange,
    closed,
    drafts,
    interactive,
    onChange,
    onInvalid,
    onSelectZone,
    points,
    zones,
  }: {
    activeZoneType: MapZoneType
    canChange?: (points: IMapBoundaryCoordinate[], closed: boolean) => boolean
    closed: boolean
    drafts: Record<string, { points: IMapBoundaryCoordinate[] }>
    interactive: boolean
    onChange: (points: IMapBoundaryCoordinate[], closed: boolean) => void
    onInvalid: () => void
    onSelectZone: (clientId: string) => void
    points: IMapBoundaryCoordinate[]
    zones: { clientId: string }[]
  }) => (
    <div
      data-testid="boundary-editor"
      data-active-zone={activeZoneType}
      data-closed={closed}
      data-points={points.length}
      data-zone-drafts={Object.values(drafts).filter((draft) => draft.points.length > 0).length}
      data-zones={zones.length}
    >
      <span>{interactive ? 'Interactive editor' : 'Read-only editor'}</span>
      <button
        type="button"
        onClick={() => {
          const pointsByZoneType: Record<MapZoneType, IMapBoundaryCoordinate[]> = {
            BOUNDARY: [
              [1.234, 1.236],
              [8.888, 1],
              [4, 7.777],
            ],
            OBSTACLE: [
              [1, 1],
              [3, 1],
              [2, 3],
            ],
            NO_GO: [
              [5, 1],
              [7, 1],
              [6, 3],
            ],
            CLEANING_ZONE: [
              [9, 1],
              [11, 1],
              [10, 3],
            ],
          }
          const nextPoints = pointsByZoneType[activeZoneType]
          if (!canChange || canChange(nextPoints, true)) onChange(nextPoints, true)
          else onInvalid()
        }}
      >
        Draw valid boundary
      </button>
      <button
        type="button"
        onClick={() =>
          onChange(
            [
              [1, 1],
              [8, 1],
            ],
            false,
          )
        }
      >
        Draw open polygon
      </button>
      <button type="button" onClick={onInvalid}>
        Draw invalid boundary
      </button>
      <button type="button" onClick={() => zones[0] && onSelectZone(zones[0].clientId)}>
        Select first zone
      </button>
      <button
        type="button"
        onClick={() => {
          for (let index = 0; index < 101; index += 1) {
            const x = 0.01 + index * 0.001
            onChange(
              [
                [x, 0.01],
                [x + 0.0005, 0.01],
                [x, 0.0105],
              ],
              true,
            )
          }
        }}
      >
        Draw 101 zones
      </button>
      <button
        type="button"
        onClick={() => {
          const overlappingPoints: IMapBoundaryCoordinate[] = [
            [1, 1],
            [3, 1],
            [2, 3],
          ]
          if (!canChange || canChange(overlappingPoints, true)) onChange(overlappingPoints, true)
          else onInvalid()
        }}
      >
        Draw overlapping zone
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
    createEnvironmentZones.mockReset()
    createEnvironmentZones.mockResolvedValue(undefined)
    saveMapBoundaries.mockReset()
    saveMapBoundaries.mockResolvedValue(undefined)
    useCreateEnvironmentZonesMutation.mockReturnValue({
      mutateAsync: createEnvironmentZones,
    })
    useSaveMapBoundariesMutation.mockReturnValue({ mutateAsync: saveMapBoundaries })
  })

  const geometry = {
    type: GeometryType.POLYGON,
    coordinates: [
      [
        [1, 1],
        [8, 1],
        [4, 8],
        [1, 1],
      ],
    ] as IMapBoundaryCoordinate[][],
  }

  it('preloads and saves a closed polygon without mutating saved coordinates', async () => {
    const original = structuredClone(geometry)
    const user = userEvent.setup()
    render(<MapBoundaryStep map={{ ...map, geometry }} mode="adjust" onClose={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Adjust layout' })).toBeInTheDocument()
    expect(screen.getByTestId('boundary-editor')).toHaveAttribute('data-points', '3')
    expect(screen.getByTestId('boundary-editor')).toHaveAttribute('data-closed', 'true')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(saveMapBoundaries).toHaveBeenCalledWith({
      map_id: map.id,
      source: MapBoundarySource.CUSTOM,
      geometry,
    })
    expect(geometry).toEqual(original)
  })

  it.each([
    { ...geometry, coordinates: [...geometry.coordinates, ...geometry.coordinates] },
    { ...geometry, type: GeometryType.LINE_STRING },
    {
      ...geometry,
      coordinates: [
        [
          [1, 1],
          [1, 1],
        ],
      ] as IMapBoundaryCoordinate[][],
    },
    {
      ...geometry,
      coordinates: [
        [
          [0, 0],
          [30, 0],
          [0, 10],
          [0, 0],
        ],
      ] as IMapBoundaryCoordinate[][],
    },
  ])('blocks unsupported saved geometry %#', (unsupported) => {
    render(
      <MapBoundaryStep map={{ ...map, geometry: unsupported }} mode="adjust" onClose={vi.fn()} />,
    )
    expect(screen.getByText(/This saved boundary cannot be edited/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('cancels adjustment without saving and reloads saved coordinates on remount', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { unmount } = render(
      <MapBoundaryStep map={{ ...map, geometry }} mode="adjust" onClose={onClose} />,
    )
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(saveMapBoundaries).not.toHaveBeenCalled()
    unmount()
    render(<MapBoundaryStep map={{ ...map, geometry }} mode="adjust" onClose={onClose} />)
    expect(screen.getByTestId('boundary-editor')).toHaveAttribute('data-points', '3')
  })

  it('uses full-map coverage when adjustment has no saved geometry', () => {
    render(<MapBoundaryStep map={map} mode="adjust" onClose={vi.fn()} />)
    expect(screen.getByRole('combobox', { name: 'Boundary method' })).toHaveTextContent(
      'Use full map area',
    )
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

  it('shows layout tools only while adjusting and gates the boundary method by tool', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<MapBoundaryStep map={map} mode="adjust" onClose={vi.fn()} />)

    expect(screen.getByRole('toolbar', { name: 'Map layout tools' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Boundary' })).toHaveAttribute('aria-pressed', 'true')
    for (const name of ['Obstacle', 'No-go', 'Cleaning zone', 'Select']) {
      expect(screen.getByRole('button', { name })).toBeEnabled()
    }

    await user.click(screen.getByRole('button', { name: 'Obstacle' }))
    expect(screen.getByRole('combobox', { name: 'Boundary method' })).toBeDisabled()
    expect(screen.getByTestId('boundary-editor')).toHaveAttribute('data-active-zone', 'OBSTACLE')
    await user.click(screen.getByRole('button', { name: 'Boundary' }))
    expect(screen.getByRole('combobox', { name: 'Boundary method' })).toBeEnabled()

    unmount()
    render(<MapBoundaryStep map={map} onClose={vi.fn()} />)
    expect(screen.queryByRole('toolbar', { name: 'Map layout tools' })).not.toBeInTheDocument()
  })

  it('preserves drafts per zone type and blocks saving while one is open', async () => {
    const user = userEvent.setup()
    render(<MapBoundaryStep map={map} mode="adjust" onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Obstacle' }))
    await user.click(screen.getByRole('button', { name: 'Draw open polygon' }))
    await user.click(screen.getByRole('button', { name: 'No-go' }))
    await user.click(screen.getByRole('button', { name: 'Draw open polygon' }))
    expect(screen.getByTestId('boundary-editor')).toHaveAttribute('data-zone-drafts', '2')

    await user.click(screen.getByRole('button', { name: 'Obstacle' }))
    expect(screen.getByTestId('boundary-editor')).toHaveAttribute('data-points', '2')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(toast.error).toHaveBeenCalledWith('Finish or clear every open polygon before saving.')
    expect(saveMapBoundaries).not.toHaveBeenCalled()
  })

  it('creates, selects, and deletes a session-only zone', async () => {
    const user = userEvent.setup()
    render(<MapBoundaryStep map={map} mode="adjust" onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Cleaning zone' }))
    await user.click(screen.getByRole('button', { name: 'Draw valid boundary' }))
    expect(screen.getByTestId('boundary-editor')).toHaveAttribute('data-zones', '1')

    await user.click(screen.getByRole('button', { name: 'Select' }))
    await user.click(screen.getByRole('button', { name: 'Select first zone' }))
    const deleteButton = screen.getByRole('button', { name: 'Delete selected zone' })
    expect(deleteButton).toBeEnabled()
    await user.click(deleteButton)
    expect(screen.getByTestId('boundary-editor')).toHaveAttribute('data-zones', '0')
  })

  it('saves every zone type after the boundary and omits editor-only IDs', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<MapBoundaryStep map={map} mode="adjust" onClose={onClose} />)

    for (const zoneType of ['Obstacle', 'No-go', 'Cleaning zone']) {
      await user.click(screen.getByRole('button', { name: zoneType }))
      await user.click(screen.getByRole('button', { name: 'Draw valid boundary' }))
    }
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(saveMapBoundaries).toHaveBeenCalledWith({
      map_id: map.id,
      source: MapBoundarySource.DIMENSIONS,
    })
    expect(createEnvironmentZones).toHaveBeenCalledWith({
      map_id: map.id,
      zones: [
        {
          type: 'OBSTACLE',
          geometry: {
            type: GeometryType.POLYGON,
            coordinates: [
              [
                [1, 1],
                [3, 1],
                [2, 3],
                [1, 1],
              ],
            ],
          },
        },
        {
          type: 'NO_GO',
          geometry: {
            type: GeometryType.POLYGON,
            coordinates: [
              [
                [5, 1],
                [7, 1],
                [6, 3],
                [5, 1],
              ],
            ],
          },
        },
        {
          type: 'CLEANING_ZONE',
          geometry: {
            type: GeometryType.POLYGON,
            coordinates: [
              [
                [9, 1],
                [11, 1],
                [10, 3],
                [9, 1],
              ],
            ],
          },
        },
      ],
    })
    expect(saveMapBoundaries.mock.invocationCallOrder[0]).toBeLessThan(
      createEnvironmentZones.mock.invocationCallOrder[0],
    )
    expect(toast.success).toHaveBeenCalledWith('Layout saved successfully.')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('blocks more than 100 zones before making a save request', async () => {
    const user = userEvent.setup()
    render(<MapBoundaryStep map={map} mode="adjust" onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Obstacle' }))
    await user.click(screen.getByRole('button', { name: 'Draw 101 zones' }))
    expect(screen.getByTestId('boundary-editor')).toHaveAttribute('data-zones', '101')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(toast.error).toHaveBeenCalledWith('A layout can contain at most 100 zones.')
    expect(saveMapBoundaries).not.toHaveBeenCalled()
    expect(createEnvironmentZones).not.toHaveBeenCalled()
  })

  it('rejects a point or polygon that overlaps an existing zone', async () => {
    const user = userEvent.setup()
    render(<MapBoundaryStep map={map} mode="adjust" onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Obstacle' }))
    await user.click(screen.getByRole('button', { name: 'Draw valid boundary' }))
    await user.click(screen.getByRole('button', { name: 'No-go' }))
    await user.click(screen.getByRole('button', { name: 'Draw overlapping zone' }))

    expect(screen.getByText('Zones cannot overlap or touch another zone.')).toBeInTheDocument()
    expect(screen.getByTestId('boundary-editor')).toHaveAttribute('data-zones', '1')
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
    expect(createEnvironmentZones).not.toHaveBeenCalled()
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

  it('skips zones and keeps the layout open when boundary saving fails', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    saveMapBoundaries.mockRejectedValueOnce({
      response: { data: { detail: 'Boundary service is unavailable' } },
    })
    render(<MapBoundaryStep map={map} mode="adjust" onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'Obstacle' }))
    await user.click(screen.getByRole('button', { name: 'Draw valid boundary' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(toast.error).toHaveBeenCalledWith('Boundary service is unavailable')
    expect(createEnvironmentZones).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('keeps zones and the layout open when zone saving fails', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    createEnvironmentZones.mockRejectedValueOnce({
      response: { data: { detail: 'Zone overlaps an existing zone' } },
    })
    render(<MapBoundaryStep map={map} mode="adjust" onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'Obstacle' }))
    await user.click(screen.getByRole('button', { name: 'Draw valid boundary' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(saveMapBoundaries).toHaveBeenCalledOnce()
    expect(createEnvironmentZones).toHaveBeenCalledOnce()
    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Zone overlaps an existing zone')
    expect(screen.getByTestId('boundary-editor')).toHaveAttribute('data-zones', '1')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('uses the localized fallback when the API has no error detail', async () => {
    const user = userEvent.setup()
    saveMapBoundaries.mockRejectedValueOnce(new Error('Unavailable'))
    render(<MapBoundaryStep map={map} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(toast.error).toHaveBeenCalledWith('Unable to save the boundary. Please try again.')
  })

  it('disables actions throughout the save sequence', async () => {
    const user = userEvent.setup()
    let finishBoundarySave: VoidFunction = () => undefined
    let finishZoneSave: VoidFunction = () => undefined
    saveMapBoundaries.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finishBoundarySave = resolve
      }),
    )
    createEnvironmentZones.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finishZoneSave = resolve
      }),
    )
    render(<MapBoundaryStep map={map} mode="adjust" onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Obstacle' }))
    await user.click(screen.getByRole('button', { name: 'Draw valid boundary' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByRole('combobox', { name: 'Boundary method' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /^Save/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled()

    await act(async () => finishBoundarySave())
    await waitFor(() => expect(createEnvironmentZones).toHaveBeenCalledOnce())
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /^Save/ })).toBeDisabled()

    await act(async () => finishZoneSave())
  })

  it('uses the layout fallback when zone saving fails without an API detail', async () => {
    const user = userEvent.setup()
    createEnvironmentZones.mockRejectedValueOnce(new Error('Unavailable'))
    render(<MapBoundaryStep map={map} mode="adjust" onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Obstacle' }))
    await user.click(screen.getByRole('button', { name: 'Draw valid boundary' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(toast.error).toHaveBeenCalledWith('Unable to save the layout. Please try again.')
  })
})
