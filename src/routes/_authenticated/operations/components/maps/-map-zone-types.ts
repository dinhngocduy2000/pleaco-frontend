import { MapZoneType } from '@/enum/maps'
import type { Geometry, IMapBoundaryCoordinate } from '@/interface/maps'

export const MAP_DRAWING_ZONE_TYPES = [
  MapZoneType.BOUNDARY,
  MapZoneType.OBSTACLE,
  MapZoneType.NO_GO,
  MapZoneType.CLEANING_ZONE,
] as const

export const MAP_AREA_ZONE_TYPES = [
  MapZoneType.OBSTACLE,
  MapZoneType.NO_GO,
  MapZoneType.CLEANING_ZONE,
] as const

export type IMapZoneStyle = {
  stroke: string
  fill: string
  strokeWidth: number
  dash?: number[]
}

export const MAP_ZONE_STYLES: Record<MapZoneType, IMapZoneStyle> = {
  [MapZoneType.BOUNDARY]: {
    stroke: '#7C3AED',
    fill: 'transparent',
    strokeWidth: 3,
  },
  [MapZoneType.OBSTACLE]: {
    stroke: '#F59E0B',
    fill: 'rgba(245, 158, 11, 0.20)',
    strokeWidth: 2,
  },
  [MapZoneType.NO_GO]: {
    stroke: '#EF4444',
    fill: 'rgba(239, 68, 68, 0.16)',
    strokeWidth: 2,
    dash: [8, 6],
  },
  [MapZoneType.CLEANING_ZONE]: {
    stroke: '#3B82F6',
    fill: 'rgba(59, 130, 246, 0.12)',
    strokeWidth: 2,
  },
}

export type IMapZoneShape = {
  clientId: string
  zoneType: Exclude<MapZoneType, MapZoneType.BOUNDARY>
  geometry: Geometry
}

export type IMapZoneDraft = {
  points: IMapBoundaryCoordinate[]
}

export type IMapZoneDrafts = Record<IMapZoneShape['zoneType'], IMapZoneDraft>

export const createEmptyZoneDrafts = (): IMapZoneDrafts => ({
  [MapZoneType.OBSTACLE]: { points: [] },
  [MapZoneType.NO_GO]: { points: [] },
  [MapZoneType.CLEANING_ZONE]: { points: [] },
})

export type MapLayoutTool = MapZoneType | 'SELECT'
