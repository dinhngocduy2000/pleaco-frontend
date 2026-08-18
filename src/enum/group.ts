export const GroupRole = {
  GUEST: 'guest',
  MEMBER: 'member',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  OWNER: 'owner',
}

export type GroupRoleType = (typeof GroupRole)[keyof typeof GroupRole]

export const LIST_ROLES = Object.values(GroupRole) as GroupRoleType[]

export const GroupMemberOrderBy = {
  JOINED_DATE: 'joined_date',
} as const

export type GroupMemberOrderByType = (typeof GroupMemberOrderBy)[keyof typeof GroupMemberOrderBy]

export const GroupMemberOrderDirection = {
  ASC: 'asc',
  DESC: 'desc',
} as const

export type GroupMemberOrderDirectionType =
  (typeof GroupMemberOrderDirection)[keyof typeof GroupMemberOrderDirection]
