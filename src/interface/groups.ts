import type z from 'zod'
import type {
  GroupMemberOrderByType,
  GroupMemberOrderDirectionType,
  GroupRoleType,
  InvitationStatusType,
} from '@/enum/group'
import type { UserStatusType } from '@/enum/users'
import type { createGroupFormSchema, inviteGroupMemberFormSchema } from '@/schemas/group-schemas'

export type ICreateGroupFormType = z.infer<ReturnType<typeof createGroupFormSchema>>
export type IInviteGroupMemberFormType = z.infer<ReturnType<typeof inviteGroupMemberFormSchema>>

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
export type ISwitchGroupRequest = {
  group_id: string
}

export type IInviteGroupMemberRequest = {
  email: string
  role: GroupRoleType
}

export type IInviteGroupMembersRequest = {
  group_id: string
  members: IInviteGroupMemberRequest[]
}

export type IGroupMemberListInfo = {
  member_id: string
  image_url: string | null
  email: string
  name: string
  joined_at: string
  role: GroupRoleType
  status: UserStatusType
  invitation_status: InvitationStatusType
}

export type IGroupMemberListRequest = {
  group_id: string
  page: number
  page_size: number
  order_by: GroupMemberOrderByType
  order_direction: GroupMemberOrderDirectionType
  email?: string
  role?: GroupRoleType
  status?: UserStatusType
  invitation_status?: InvitationStatusType
}
