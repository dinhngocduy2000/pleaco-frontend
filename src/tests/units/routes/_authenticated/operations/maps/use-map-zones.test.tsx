import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MapZoneType } from '@/enum/maps'
import { useMapZones } from '@/routes/_authenticated/operations/components/maps/-use-map-zones'

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
})
