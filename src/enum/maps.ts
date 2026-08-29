export const MapStatus = {
  ASSIGNED: 'ASSIGNED',
  UNASSIGNED: 'UNASSIGNED',
} as const

export type MapStatusType = (typeof MapStatus)[keyof typeof MapStatus]

export const MapOrderDirection = {
  ASC: 'asc',
  DESC: 'desc',
} as const

export type MapOrderDirectionType = (typeof MapOrderDirection)[keyof typeof MapOrderDirection]
