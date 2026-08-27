import type z from 'zod'
import type { createMapFormSchema } from '@/schemas/map-schemas'

export type ICreateMapFormType = z.infer<ReturnType<typeof createMapFormSchema>>

export type ICreateMapRequest = {
  group_id: string
  name: string
  description?: string
  dimension_x: number
  dimension_y: number
  robot_ids: string[]
  tags: string[]
}
