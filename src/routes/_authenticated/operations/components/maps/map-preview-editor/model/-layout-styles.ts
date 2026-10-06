import { MapZoneType } from '@/enum/maps'
import { DOCKING_STATION_TOOL, type MapCanvasZoneType } from './-layout-types'

export type IMapZoneStyle = {
  stroke: string
  fill: string
  strokeWidth: number
  dash?: number[]
  heading?: string
}

export const MAP_ZONE_STYLES: Record<MapCanvasZoneType, IMapZoneStyle> = {
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
  [DOCKING_STATION_TOOL]: {
    stroke: '#22C55E',
    fill: 'rgba(34, 197, 94, 0.16)',
    heading: '#16A34A',
    strokeWidth: 2,
  },
}
