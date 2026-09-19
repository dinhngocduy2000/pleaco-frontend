import { io, type Socket } from 'socket.io-client'
import { ENV_CONFIGS } from '@/lib/env-const'
import { createMapRoomManager } from './map-rooms'
import type { ClientToServerEvents, ServerToClientEvents } from './types'

export type { RoomAcknowledgement, RoomOperationError } from './types'

const realtimeOrigin = new URL(ENV_CONFIGS.VITE_API_ENDPOINT, window.location.origin).origin

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(realtimeOrigin, {
  path: '/api/v1/ws',
  withCredentials: true,
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Number.POSITIVE_INFINITY,
  reconnectionDelay: 1_000,
  reconnectionDelayMax: 30_000,
  randomizationFactor: 0,
})

export const connectRealtime = () => {
  if (!socket.active) socket.connect()
}

const mapRooms = createMapRoomManager(socket, connectRealtime)

export const subscribeToMap = mapRooms.subscribe
export const unsubscribeFromMap = mapRooms.unsubscribe

export const disconnectRealtime = () => {
  mapRooms.clear()
  socket.disconnect()
}

export const reconnectRealtime = () => {
  socket.disconnect().connect()
}
