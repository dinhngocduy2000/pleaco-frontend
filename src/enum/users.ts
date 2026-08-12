export const UserStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  PENDING: 'PENDING',
  DELETED: 'DELETED',
} as const

export type UserStatusType = (typeof UserStatus)[keyof typeof UserStatus]
