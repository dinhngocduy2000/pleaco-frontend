import type z from 'zod'
import type { RobotModelType } from '@/enum/robot'
import type { createRobotFormSchema } from '@/schemas/robot-schemas'

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
