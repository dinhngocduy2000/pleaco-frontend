import type z from 'zod'
import type { MapOrderDirectionType, MapStatusType } from '@/enum/maps'
import type { createMapFormSchema } from '@/schemas/map-schemas'
import type { ITagInfo } from './tags'

export type ICreateMapFormType = z.infer<ReturnType<typeof createMapFormSchema>>

export type IMapBoundaryCoordinate = [x: number, y: number]

export type IMapBoundaryPolygon = IMapBoundaryCoordinate[]

export type IMapBoundaries = IMapBoundaryPolygon[]

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
}

export type IMapListRequest = {
  page: number
  page_size: number
  search?: string
  status?: MapStatusType
  tag_ids?: string[]
  order_direction: MapOrderDirectionType
}
