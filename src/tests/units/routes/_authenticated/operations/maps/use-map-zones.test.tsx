import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MapZoneType } from '@/enum/maps'
import { useMapZones } from '@/routes/_authenticated/operations/components/maps/-use-map-zones'

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

describe('useMapZones', () => {
  it('preserves a draft for every type and serializes multiple completed polygons', () => {
    const { result } = renderHook(useMapZones)

    act(() =>
      result.current.handleZoneChange(MapZoneType.OBSTACLE, firstTriangle.slice(0, 2), false),
    )
    act(() => result.current.handleZoneChange(MapZoneType.NO_GO, [[5, 5]], false))
    expect(result.current.drafts.OBSTACLE.points).toEqual(firstTriangle.slice(0, 2))
    expect(result.current.drafts.NO_GO.points).toEqual([[5, 5]])

    act(() => result.current.handleZoneChange(MapZoneType.OBSTACLE, firstTriangle, true))
    act(() => result.current.handleZoneChange(MapZoneType.OBSTACLE, secondTriangle, true))
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

  it('reopens the latest completed polygon on undo and supports selection updates and deletion', () => {
    const { result } = renderHook(useMapZones)
    act(() => result.current.handleZoneChange(MapZoneType.CLEANING_ZONE, firstTriangle, true))
    const clientId = result.current.zones[0].clientId

    act(() => result.current.handleUndoZone(MapZoneType.CLEANING_ZONE))
    expect(result.current.zones).toEqual([])
    expect(result.current.drafts.CLEANING_ZONE.points).toEqual(firstTriangle)

    act(() => result.current.handleZoneChange(MapZoneType.CLEANING_ZONE, secondTriangle, true))
    const selectedId = result.current.zones[0].clientId
    act(() => result.current.setSelectedZoneId(selectedId))
    act(() => result.current.handleSelectedZoneChange(firstTriangle))
    expect(result.current.selectedZone?.geometry.coordinates).toEqual([
      [...firstTriangle, firstTriangle[0]],
    ])

    act(() => result.current.handleDeleteSelectedZone())
    expect(result.current.zones).toEqual([])
    expect(result.current.selectedZoneId).toBeUndefined()
    expect(clientId).not.toBe(selectedId)
  })
})
