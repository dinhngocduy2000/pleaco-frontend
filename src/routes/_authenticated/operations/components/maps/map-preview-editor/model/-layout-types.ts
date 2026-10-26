import type { DockingStationHeading } from '@/enum/maps'
import { MapZoneType } from '@/enum/maps'
import type { Geometry, IMapBoundaryCoordinate } from '@/interface/maps'

export const MAP_DRAWING_ZONE_TYPES = [
  MapZoneType.BOUNDARY,
  MapZoneType.OBSTACLE,
  MapZoneType.NO_GO,
  MapZoneType.CLEANING_ZONE,
] as const

export const DOCKING_STATION_TOOL = 'DOCKING_STATION' as const
export const DOCKING_STATION_SIZE_METERS = 4

export const MAP_AREA_ZONE_TYPES = [
  MapZoneType.OBSTACLE,
  MapZoneType.NO_GO,
  MapZoneType.CLEANING_ZONE,
] as const

export type MapCanvasZoneType = MapZoneType | typeof DOCKING_STATION_TOOL

export type IMapZoneShape = {
  clientId: string
  id?: string
  to_delete: boolean
  zoneType: Exclude<MapZoneType, MapZoneType.BOUNDARY>
  geometry: Geometry
}

export type IMapDockingStationShape = {
  clientId: string
  id?: string
  to_delete: false
  zoneType: typeof DOCKING_STATION_TOOL
  geometry: Geometry
  heading: DockingStationHeading
  robot_id: string | null
}

export type IMapLayoutShape = IMapZoneShape | IMapDockingStationShape

export type IMapZoneDraft = {
  points: IMapBoundaryCoordinate[]
}

export type IMapZoneDrafts = Record<IMapZoneShape['zoneType'], IMapZoneDraft>

export const createEmptyZoneDrafts = (): IMapZoneDrafts => ({
  [MapZoneType.OBSTACLE]: { points: [] },
  [MapZoneType.NO_GO]: { points: [] },
  [MapZoneType.CLEANING_ZONE]: { points: [] },
})

export type MapLayoutTool = MapCanvasZoneType | 'SELECT'
