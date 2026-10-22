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
  randomizationFactor: 0.5,
})

const mapSubscriptionListeners = new Map<() => void, number>()
let connectionConsumers = 0

export const connectRealtime = () => {
  if (!socket.active) socket.connect()
}

const mapRooms = createMapRoomManager(socket, connectRealtime, () => {
  for (const listener of mapSubscriptionListeners.keys()) listener()
})

export const subscribeToMap = mapRooms.subscribe
export const unsubscribeFromMap = mapRooms.unsubscribe

const disconnectRealtime = () => {
  mapRooms.clear()
  socket.disconnect()
}

export const realtimeConnection = {
  socket,
  connect: connectRealtime,
  subscribeToMap,
  unsubscribeFromMap,
}

export const acquireRealtimeConnection = (onMapSubscribed?: () => void) => {
  connectionConsumers += 1
  if (onMapSubscribed) {
    mapSubscriptionListeners.set(
      onMapSubscribed,
      (mapSubscriptionListeners.get(onMapSubscribed) ?? 0) + 1,
    )
  }

  let released = false
  return {
    connection: realtimeConnection,
    release: () => {
      if (released) return
      released = true

      if (onMapSubscribed) {
        const listenerReferences = mapSubscriptionListeners.get(onMapSubscribed) ?? 0
        if (listenerReferences <= 1) mapSubscriptionListeners.delete(onMapSubscribed)
        else mapSubscriptionListeners.set(onMapSubscribed, listenerReferences - 1)
      }

      connectionConsumers -= 1
      if (connectionConsumers === 0) disconnectRealtime()
    },
  }
}
