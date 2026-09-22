import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GeometryType, MapZoneType } from '@/enum/maps'
import {
  DOCKING_STATION_TOOL,
  type IMapZoneShape,
} from '@/routes/_authenticated/operations/components/maps/map-preview-editor/utils/-map-zone-types'
import { useMapZones } from '@/routes/_authenticated/operations/components/maps/map-preview-editor/utils/-use-map-zones'

const boundary: [number, number][] = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
]

const firstTriangle: [number, number][] = [
  [1, 1],
  [4, 1],
  [2, 4],
]

const secondTriangle: [number, number][] = [
  [5, 1],
  [8, 1],
  [6, 4],
]

const renderMapZones = (overrides: Partial<Parameters<typeof useMapZones>[0]> = {}) => {
  const options = {
    boundaryPoints: boundary,
    boundaryClosed: true,
    boundaryEditable: true,
    boundaryValid: true,
    boundaryCanUndo: true,
    boundaryCanClear: true,
    disabled: false,
    onBoundaryChange: vi.fn(),
    onBoundaryClear: vi.fn(),
    onBoundaryUndo: vi.fn(),
    ...overrides,
  }
  return { ...renderHook(() => useMapZones(options)), options }
}

describe('useMapZones', () => {
  it('defaults to boundary editing and delegates boundary actions', () => {
    const { result, options } = renderMapZones()

    expect(result.current.activeTool).toBe(MapZoneType.BOUNDARY)
    expect(result.current.activePoints).toBe(boundary)
    expect(result.current.activeClosed).toBe(true)
    expect(result.current.activeInteractive).toBe(true)

    act(() => result.current.handleActiveChange(firstTriangle, true))
    expect(options.onBoundaryChange).toHaveBeenCalledWith(firstTriangle, true)
    act(() => result.current.handleUndo())
    expect(options.onBoundaryUndo).toHaveBeenCalledOnce()
    act(() => result.current.handleClear())
    expect(options.onBoundaryClear).toHaveBeenCalledOnce()
  })

  it('preserves a draft for every type and serializes multiple completed polygons', () => {
    const { result } = renderMapZones()

    act(() => result.current.handleToolChange(MapZoneType.OBSTACLE))
    act(() => result.current.handleActiveChange(firstTriangle.slice(0, 2), false))
    act(() => result.current.handleToolChange(MapZoneType.NO_GO))
    act(() => result.current.handleActiveChange([[5, 5]], false))
    expect(result.current.drafts.OBSTACLE.points).toEqual(firstTriangle.slice(0, 2))
    expect(result.current.drafts.NO_GO.points).toEqual([[5, 5]])
    expect(result.current.hasOpenPolygon).toBe(true)

    act(() => result.current.handleToolChange(MapZoneType.OBSTACLE))
    act(() => result.current.handleActiveChange(firstTriangle, true))
    act(() => result.current.handleActiveChange(secondTriangle, true))
    expect(result.current.zones).toHaveLength(2)
    expect(result.current.zones[0]).toMatchObject({
      clientId: 'map-zone-1',
      zoneType: MapZoneType.OBSTACLE,
      geometry: {
        type: 'Polygon',
        coordinates: [[...firstTriangle, firstTriangle[0]]],
      },
    })
  })

  it('reopens the latest polygon on undo and supports selection updates and deletion', () => {
    const { result } = renderMapZones()
    act(() => result.current.handleToolChange(MapZoneType.CLEANING_ZONE))
    act(() => result.current.handleActiveChange(firstTriangle, false))
    act(() => result.current.handleActiveChange(firstTriangle, true))

    act(() => result.current.handleUndo())
    expect(result.current.zones).toEqual([])
    expect(result.current.drafts.CLEANING_ZONE.points).toEqual(firstTriangle)

    act(() => result.current.handleActiveChange(secondTriangle, true))
    const selectedId = result.current.zones[0].clientId
    act(() => result.current.handleToolChange('SELECT'))
    act(() => result.current.setSelectedZoneId(selectedId))
    expect(result.current.activePoints).toEqual(secondTriangle)
    expect(result.current.activeZoneType).toBe(MapZoneType.CLEANING_ZONE)

    act(() => result.current.handleActiveChange(firstTriangle, true))
    expect(result.current.zones[0].geometry.coordinates).toEqual([
      [...firstTriangle, firstTriangle[0]],
    ])
    act(() => result.current.handleDeleteSelectedZone())
    expect(result.current.zones).toEqual([])
    expect(result.current.selectedZoneId).toBeUndefined()
  })

  it('owns containment, overlap, and boundary-fit validation errors', () => {
    const { result } = renderMapZones()
    act(() => result.current.handleToolChange(MapZoneType.OBSTACLE))
    act(() => result.current.handleActiveChange(firstTriangle, true))
    act(() => result.current.handleToolChange(MapZoneType.NO_GO))

    act(() => {
      expect(result.current.canChangeActive([[2, 2]], false)).toBe(false)
      result.current.handleInvalid()
    })
    expect(result.current.validationError).toBe('ZONE_OVERLAP')

    act(() => {
      expect(result.current.canChangeActive([[11, 2]], false)).toBe(false)
      result.current.handleInvalid()
    })
    expect(result.current.validationError).toBe('ZONE_INVALID')

    act(() => result.current.handleToolChange(MapZoneType.BOUNDARY))
    act(() => {
      expect(
        result.current.canChangeActive(
          [
            [0, 0],
            [1.5, 0],
            [1.5, 1.5],
            [0, 1.5],
          ],
          true,
        ),
      ).toBe(false)
      result.current.handleInvalid()
    })
    expect(result.current.validationError).toBe('BOUNDARY_INVALID')
  })

  it('stores multiple immutable docking stations in local history and validates them as zones', () => {
    const largeBoundary: [number, number][] = [
      [0, 0],
      [30, 0],
      [30, 30],
      [0, 30],
    ]
    const firstStation: [number, number][] = [
      [1, 1],
      [11, 1],
      [11, 11],
      [1, 11],
    ]
    const secondStation: [number, number][] = [
      [15, 15],
      [25, 15],
      [25, 25],
      [15, 25],
    ]
    const { result } = renderMapZones({ boundaryPoints: largeBoundary })

    act(() => result.current.handleToolChange(DOCKING_STATION_TOOL))
    act(() => result.current.handleActiveChange(firstStation, true))
    act(() => result.current.handleActiveChange(secondStation, true))

    expect(result.current.dockingStations).toHaveLength(2)
    expect(result.current.visibleLayoutShapes).toHaveLength(2)
    expect(result.current.visibleZones).toEqual([])
    expect(result.current.activeCanUndo).toBe(true)

    act(() => result.current.handleUndo())
    expect(result.current.dockingStations).toHaveLength(1)
    act(() => result.current.handleActiveChange(secondStation, true))

    act(() => result.current.handleToolChange(MapZoneType.OBSTACLE))
    expect(result.current.canChangeActive(firstStation, true)).toBe(false)
    act(() => result.current.handleToolChange(MapZoneType.BOUNDARY))
    expect(result.current.canChangeActive(boundary, true)).toBe(false)

    const stationId = result.current.dockingStations[0].clientId
    act(() => result.current.handleToolChange('SELECT'))
    act(() => result.current.setSelectedZoneId(stationId))
    expect(result.current.activePoints).toEqual([])
    expect(result.current.activeInteractive).toBe(true)
    act(() => result.current.handleActiveChange(secondTriangle, true))
    expect(result.current.dockingStations[0].geometry.coordinates[0].slice(0, -1)).toEqual(
      firstStation,
    )
    act(() => result.current.handleDeleteSelectedZone())
    expect(result.current.dockingStations).toHaveLength(1)
    act(() => result.current.handleToolChange(DOCKING_STATION_TOOL))
    act(() => result.current.handleClear())
    expect(result.current.dockingStations).toEqual([])
  })
  it('protects saved zones and restores moves and deletions with their backend IDs', () => {
    const saved: IMapZoneShape = {
      clientId: 'saved',
      id: 'saved',
      to_delete: false,
      zoneType: MapZoneType.OBSTACLE,
      geometry: { type: GeometryType.POLYGON, coordinates: [[...firstTriangle, firstTriangle[0]]] },
    }
    const { result, rerender } = renderMapZones({ initialZones: [saved] })
    act(() => result.current.handleToolChange(MapZoneType.OBSTACLE))
    expect(result.current.activeCanUndo).toBe(false)
    expect(result.current.activeCanClear).toBe(false)
    act(() => {
      result.current.handleUndo()
      result.current.handleClear()
    })
    expect(result.current.zones).toEqual([saved])
    act(() => result.current.handleToolChange('SELECT'))
    act(() => result.current.setSelectedZoneId('saved'))
    act(() => result.current.handleActiveChange(secondTriangle, true))
    act(() => result.current.handleDeleteSelectedZone())
    act(() => result.current.handleToolChange(MapZoneType.OBSTACLE))
    rerender()
    act(() => result.current.handleUndo())
    expect(result.current.visibleZones[0].geometry.coordinates[0]).toEqual([
      ...secondTriangle,
      secondTriangle[0],
    ])
    act(() => result.current.handleUndo())
    expect(result.current.zones).toEqual([saved])
    expect(result.current.activeCanUndo).toBe(false)
    expect(result.current.activeCanClear).toBe(false)
  })

  it('clears only the active type, including completed zones, drafts, moves, and deletions', () => {
    const saved: IMapZoneShape = {
      clientId: 'saved',
      id: 'saved',
      to_delete: false,
      zoneType: MapZoneType.OBSTACLE,
      geometry: { type: GeometryType.POLYGON, coordinates: [[...firstTriangle, firstTriangle[0]]] },
    }
    const { result } = renderMapZones({ initialZones: [saved] })
    act(() => result.current.handleToolChange('SELECT'))
    act(() => result.current.setSelectedZoneId('saved'))
    act(() => result.current.handleActiveChange(secondTriangle, true))
    act(() => result.current.handleDeleteSelectedZone())
    act(() => result.current.handleToolChange(MapZoneType.NO_GO))
    act(() => result.current.handleActiveChange(secondTriangle, true))
    act(() => result.current.handleToolChange(MapZoneType.OBSTACLE))
    act(() => result.current.handleActiveChange(firstTriangle, true))
    act(() => result.current.handleActiveChange([[9, 9]], false))
    act(() => result.current.handleClear())
    expect(result.current.zones.find((zone) => zone.id === 'saved')).toEqual(saved)
    expect(result.current.zones).toHaveLength(2)
    expect(result.current.drafts.OBSTACLE.points).toEqual([])
    expect(result.current.activeCanUndo).toBe(false)
    expect(result.current.activeCanClear).toBe(false)
    act(() => result.current.handleToolChange(MapZoneType.NO_GO))
    expect(result.current.activeCanUndo).toBe(true)
  })

  it('allows conflicting restores, flags both zones, and removes issues when resolved', () => {
    const saved: IMapZoneShape = {
      clientId: 'saved',
      id: 'saved',
      to_delete: false,
      zoneType: MapZoneType.OBSTACLE,
      geometry: { type: GeometryType.POLYGON, coordinates: [[...firstTriangle, firstTriangle[0]]] },
    }
    const { result } = renderMapZones({ initialZones: [saved] })
    act(() => result.current.handleToolChange('SELECT'))
    act(() => result.current.setSelectedZoneId('saved'))
    act(() => result.current.handleDeleteSelectedZone())
    act(() => result.current.handleToolChange(MapZoneType.CLEANING_ZONE))
    act(() => result.current.handleActiveChange(firstTriangle, true))
    expect(result.current.issues).toEqual([])
    act(() => result.current.handleToolChange(MapZoneType.OBSTACLE))
    act(() => result.current.handleClear())
    expect(result.current.issues).toHaveLength(2)
    expect(result.current.issues.every((issue) => issue.overlap)).toBe(true)
    act(() => result.current.handleToolChange(MapZoneType.CLEANING_ZONE))
    act(() => result.current.handleClear())
    expect(result.current.issues).toEqual([])
  })

  it('records point edits and closure individually, ignoring unchanged drafts', () => {
    const { result } = renderMapZones()
    act(() => result.current.handleToolChange(MapZoneType.NO_GO))
    for (let count = 1; count <= 3; count++) {
      act(() => result.current.handleActiveChange(firstTriangle.slice(0, count), false))
    }
    act(() => result.current.handleActiveChange(firstTriangle, false))
    act(() => result.current.handleActiveChange(firstTriangle, true))
    act(() => result.current.handleUndo())
    expect(result.current.drafts.NO_GO.points).toEqual(firstTriangle)
    expect(result.current.visibleZones).toEqual([])
    for (let count = 2; count >= 0; count--) {
      act(() => result.current.handleUndo())
      expect(result.current.drafts.NO_GO.points).toHaveLength(count)
    }
    expect(result.current.activeCanUndo).toBe(false)
  })
  it('flags drafts and zones outside a restored boundary, excluding deleted zones', () => {
    const saved: IMapZoneShape = {
      clientId: 'saved',
      id: 'saved',
      to_delete: false,
      zoneType: MapZoneType.OBSTACLE,
      geometry: {
        type: GeometryType.POLYGON,
        coordinates: [[...secondTriangle, secondTriangle[0]]],
      },
    }
    const { result } = renderMapZones({ initialZones: [saved], boundaryPoints: firstTriangle })
    expect(result.current.issues).toEqual([
      expect.objectContaining({ key: 'saved', outsideBoundary: true }),
    ])
    act(() => result.current.handleToolChange(MapZoneType.NO_GO))
    act(() => result.current.handleActiveChange([[9, 9]], false))
    expect(result.current.issues).toHaveLength(2)
    act(() => result.current.handleToolChange('SELECT'))
    act(() => result.current.setSelectedZoneId('saved'))
    act(() => result.current.handleDeleteSelectedZone())
    expect(result.current.issues).toEqual([
      expect.objectContaining({ key: 'draft-NO_GO', outsideBoundary: true }),
    ])
  })
})
