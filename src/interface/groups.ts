import type z from 'zod'
import type { createGroupFormSchema } from '@/schemas/group-schemas'

export type ICreateGroupFormType = z.infer<ReturnType<typeof createGroupFormSchema>>

export type ICreateGroupRequest = {
  name: string
  description?: string | null
  members?: string[]
}

export type IGroupInfo = {
  id: string
  name: string
  created_at: string
  updated_at: string
  members:
    | {
        id: string
        name: string
        email: string
      }[]
    | null
}
