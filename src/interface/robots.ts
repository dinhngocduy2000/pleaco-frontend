import type z from 'zod'
import type {
  RobotConnectionStatusType,
  RobotModelType,
  RobotOperationStatusType,
} from '@/enum/robot'
import type { createRobotFormSchema } from '@/schemas/robot-schemas'
import type { ITagInfo } from './tags'
import type { IOption } from './utils'

export type ICreateRobotFormType = z.infer<ReturnType<typeof createRobotFormSchema>>

export type ICreateRobotRequest = {
  group_id: string
  name: string
  serial_num: string
  model: RobotModelType
  map_id: string | null
  ip_address: string
  tags: string[]
}

export type IRobotInfo = {
  map_name?: string
  serial_num: string
  name: string
  model: RobotModelType
  ip_address: string | null
  id: string
  operational_status: RobotOperationStatusType
  created_at: string
  connection_status: RobotConnectionStatusType
  last_seen_at?: string | null
  tags: ITagInfo[]
}

export type IRobotKeyValue = {
  serial_num: string
} & IOption

export type IRobotListRequest = {
  group_id: string
  page: number
  page_size: number
  search?: string
  model?: RobotModelType
  operational_status?: RobotOperationStatusType
  connection_status?: RobotConnectionStatusType
  tag_ids?: string[]
}
