import type { IRobotStatus } from '@/interface/robots'

export type RoomOperationError =
  | 'AUTHENTICATION_REQUIRED'
  | 'INVALID_PAYLOAD'
  | 'GROUP_REQUIRED'
  | 'MAP_NOT_FOUND'
  | 'MAP_ACCESS_DENIED'
  | 'ROOM_OPERATION_FAILED'
  | 'INTERNAL_ERROR'

export type RoomAcknowledgement = { success: true } | { success: false; error: RoomOperationError }

export type MapRoomPayload = {
  mapId: string
}

export type ServerToClientEvents = {
  'robot.status': (status: IRobotStatus) => void
}

export type ClientToServerEvents = {
  'map.subscribe': (
    payload: MapRoomPayload,
    acknowledge: (acknowledgement: RoomAcknowledgement) => void,
  ) => void
  'map.unsubscribe': (
    payload: MapRoomPayload,
    acknowledge: (acknowledgement: RoomAcknowledgement) => void,
  ) => void
}
