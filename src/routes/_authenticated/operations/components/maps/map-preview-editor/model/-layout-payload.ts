import { GeometryType, MapBoundarySource } from '@/enum/maps'
import type {
  Geometry,
  IMapBoundaryCoordinate,
  IMapLayoutBoundarySave,
  ISaveMapLayoutRequest,
} from '@/interface/maps'
import {
  getFullMapBoundaries,
  type IMapBoundaryEditorMap,
  serializeBoundary,
} from './-boundary-format'
import type { IMapDockingStationShape, IMapZoneShape } from './-layout-types'

export type MapLayoutPayloadInput = {
  mapId: string
  method: MapBoundarySource
  points: IMapBoundaryCoordinate[]
  hasBoundaryChanges: boolean
  hasEnvironmentZoneChanges: boolean
  zones: IMapZoneShape[]
  hasDockingStationChanges: boolean
  dockingStations: IMapDockingStationShape[]
}

export const createBoundaryRequest = (
  method: MapBoundarySource,
  points: IMapBoundaryCoordinate[],
): IMapLayoutBoundarySave =>
  method === MapBoundarySource.CUSTOM
    ? {
        source: MapBoundarySource.CUSTOM,
        geometry: { type: GeometryType.POLYGON, coordinates: serializeBoundary(points) },
      }
    : { source: MapBoundarySource.DIMENSIONS }

export const createBoundaryGeometry = (
  map: IMapBoundaryEditorMap,
  method: MapBoundarySource,
  points: IMapBoundaryCoordinate[],
): Geometry => ({
  type: GeometryType.POLYGON,
  coordinates:
    method === MapBoundarySource.CUSTOM
      ? serializeBoundary(points)
      : getFullMapBoundaries(map.dimension_x, map.dimension_y),
})

/** Point order is significant, matching the editor's existing change detection. */
export const boundaryGeometriesEqual = (initialGeometry: Geometry, currentGeometry: Geometry) =>
  JSON.stringify(initialGeometry) === JSON.stringify(currentGeometry)

/** Builds the atomic request from sections changed in this editing session. */
export const createMapLayoutPayload = ({
  mapId,
  method,
  points,
  hasBoundaryChanges,
  hasEnvironmentZoneChanges,
  zones,
  hasDockingStationChanges,
  dockingStations,
}: MapLayoutPayloadInput): ISaveMapLayoutRequest => ({
  map_id: mapId,
  ...(hasBoundaryChanges && { boundary: createBoundaryRequest(method, points) }),
  ...(hasEnvironmentZoneChanges && {
    environment_zones: zones.map(({ id, to_delete, zoneType, geometry }) =>
      id === undefined
        ? { to_delete, type: zoneType, geometry }
        : { id, to_delete, type: zoneType, geometry },
    ),
  }),
  ...(hasDockingStationChanges && {
    docking_stations: dockingStations.map(({ id, geometry, heading, robot_id }) =>
      id === undefined ? { geometry, heading, robot_id } : { id, geometry, heading, robot_id },
    ),
  }),
})
