import type z from 'zod'
import type {
  DockingStationHeading,
  GeometryType,
  MapBoundarySource,
  MapOrderDirectionType,
  MapStatusType,
  MapZoneType,
} from '@/enum/maps'
import type {
  RobotConnectionStatusType,
  RobotModelType,
  RobotOperationStatusType,
} from '@/enum/robot'
import type { createMapFormSchema } from '@/schemas/map-schemas'
import type { ITagInfo } from './tags'

export type ICreateMapFormType = z.infer<ReturnType<typeof createMapFormSchema>>

export type IMapBoundaryCoordinate = [x: number, y: number]

export type IMapBoundaryPolygon = IMapBoundaryCoordinate[]

export type IMapBoundaries = IMapBoundaryPolygon[]

export type IMapLayoutBoundarySave = {
  source: MapBoundarySource
  geometry?: Geometry
}

export type Geometry = {
  type: GeometryType
  coordinates: IMapBoundaries
}

export type IEnvironmentZoneCreateItem = {
  id?: string
  to_delete: boolean
  type: Exclude<MapZoneType, MapZoneType.BOUNDARY>
  geometry: Geometry
}

export type IDockingStationSaveItem = {
  id?: string
  geometry: Geometry
  heading?: DockingStationHeading | null
  robot_id?: string | null
}

export type ISaveMapLayoutRequest = {
  map_id: string
  boundary?: IMapLayoutBoundarySave | null
  environment_zones?: IEnvironmentZoneCreateItem[] | null
  docking_stations?: IDockingStationSaveItem[] | null
}

export type IDockingStationInfo = {
  id: string
  robot_id: string | null
  geometry: Geometry
  heading: DockingStationHeading
}

export type ICreateMapRequest = {
  group_id: string
  name: string
  description?: string
  dimension_x: number
  dimension_y: number
  robot_ids: string[]
  tags: string[]
}

export type IMapListInfo = {
  id: string
  name: string
  description: string | null
  status: MapStatusType
  tags: ITagInfo[]
  dimension_x: number
  dimension_y: number
  updated_at: string
  geometry?: Geometry
}

export type IMapListRequest = {
  page: number
  page_size: number
  search?: string
  status?: MapStatusType
  tag_ids?: string[]
  order_direction: MapOrderDirectionType
}

export type IMapDetailTagInfo = {
  id: string
  name: string
}

export type IMapDetailRobotInfo = {
  id: string
  name: string
  serial_num: string
  model: RobotModelType
  connection_status: RobotConnectionStatusType
  operational_status: RobotOperationStatusType
}

export type IMapDetailZoneInfo = {
  id: string
  type: Exclude<MapZoneType, MapZoneType.BOUNDARY>
  geometry: Geometry
}

export type IMapDetailInfo = {
  id: string
  name: string
  description: string | null
  status: MapStatusType
  dimension_x: number
  dimension_y: number
  created_at: string
  updated_at: string
  tags: IMapDetailTagInfo[]
  robots: IMapDetailRobotInfo[]
  boundary: Geometry | null
  zones: IMapDetailZoneInfo[]
  docking_stations: IDockingStationInfo[]
}
