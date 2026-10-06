import { describe, expect, it } from 'vitest'
import { DockingStationHeading, GeometryType, MapBoundarySource, MapZoneType } from '@/enum/maps'
import {
  createMapLayoutPayload,
  type MapLayoutPayloadInput,
} from '@/routes/_authenticated/operations/components/maps/map-preview-editor/model/-layout-payload'

const points: [number, number][] = [
  [0, 0],
  [4, 0],
  [4, 4],
  [0, 4],
]
const geometry = { type: GeometryType.POLYGON, coordinates: [[...points, points[0]]] }
const input: MapLayoutPayloadInput = {
  mapId: 'map-1',
  method: MapBoundarySource.DIMENSIONS,
  points: [],
  hasBoundaryChanges: false,
  hasEnvironmentZoneChanges: false,
  zones: [],
  hasDockingStationChanges: false,
  dockingStations: [],
}

describe('createMapLayoutPayload', () => {
  it('includes only a changed dimensions boundary', () => {
    expect(createMapLayoutPayload({ ...input, hasBoundaryChanges: true })).toEqual({
      map_id: 'map-1',
      boundary: { source: MapBoundarySource.DIMENSIONS },
    })
  })

  it('serializes a changed custom boundary', () => {
    expect(
      createMapLayoutPayload({
        ...input,
        method: MapBoundarySource.CUSTOM,
        points,
        hasBoundaryChanges: true,
      }),
    ).toEqual({
      map_id: 'map-1',
      boundary: { source: MapBoundarySource.CUSTOM, geometry },
    })
  })

  it('includes changed zones without editor-only IDs or an unchanged boundary', () => {
    expect(
      createMapLayoutPayload({
        ...input,
        hasEnvironmentZoneChanges: true,
        zones: [
          { clientId: 'local', to_delete: false, zoneType: MapZoneType.OBSTACLE, geometry },
          {
            clientId: 'saved',
            id: 'zone-1',
            to_delete: true,
            zoneType: MapZoneType.NO_GO,
            geometry,
          },
        ],
      }),
    ).toEqual({
      map_id: 'map-1',
      environment_zones: [
        { to_delete: false, type: MapZoneType.OBSTACLE, geometry },
        { id: 'zone-1', to_delete: true, type: MapZoneType.NO_GO, geometry },
      ],
    })
  })

  it('includes changed stations and an empty list when all are removed', () => {
    const changed = { ...input, hasDockingStationChanges: true }
    expect(createMapLayoutPayload(changed)).toEqual({ map_id: 'map-1', docking_stations: [] })
    expect(
      createMapLayoutPayload({
        ...changed,
        dockingStations: [
          {
            clientId: 'saved',
            id: 'station-1',
            to_delete: false,
            zoneType: 'DOCKING_STATION',
            geometry,
            heading: DockingStationHeading.SOUTH,
            robot_id: 'robot-1',
          },
        ],
      }),
    ).toEqual({
      map_id: 'map-1',
      docking_stations: [
        {
          id: 'station-1',
          geometry,
          heading: DockingStationHeading.SOUTH,
          robot_id: 'robot-1',
        },
      ],
    })
  })

  it('includes all changed sections together and omits unchanged sections', () => {
    expect(createMapLayoutPayload(input)).toEqual({ map_id: 'map-1' })
    expect(
      createMapLayoutPayload({
        ...input,
        hasBoundaryChanges: true,
        hasEnvironmentZoneChanges: true,
        hasDockingStationChanges: true,
      }),
    ).toEqual({
      map_id: 'map-1',
      boundary: { source: MapBoundarySource.DIMENSIONS },
      environment_zones: [],
      docking_stations: [],
    })
  })
})
