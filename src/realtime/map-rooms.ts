import type { Socket } from 'socket.io-client'
import type { ClientToServerEvents, RoomAcknowledgement, ServerToClientEvents } from './types'

const ROOM_OPERATION_TIMEOUT_MS = 5_000
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ROOM_OPERATION_ERRORS = new Set([
  'AUTHENTICATION_REQUIRED',
  'INVALID_PAYLOAD',
  'GROUP_REQUIRED',
  'MAP_NOT_FOUND',
  'MAP_ACCESS_DENIED',
  'ROOM_OPERATION_FAILED',
  'INTERNAL_ERROR',
])

type MapRoomState = {
  joined: boolean
  pending?: Promise<RoomAcknowledgement>
  references: number
}

type RealtimeSocket = Socket<ServerToClientEvents, ClientToServerEvents>
type RoomEvent = 'map.subscribe' | 'map.unsubscribe'

const invalidPayloadAcknowledgement = (): RoomAcknowledgement => ({
  success: false,
  error: 'INVALID_PAYLOAD',
})

const isRoomAcknowledgement = (value: unknown): value is RoomAcknowledgement => {
  if (!value || typeof value !== 'object') return false
  const acknowledgement = value as Record<string, unknown>
  if (acknowledgement.success === true) return true
  return (
    acknowledgement.success === false &&
    typeof acknowledgement.error === 'string' &&
    ROOM_OPERATION_ERRORS.has(acknowledgement.error)
  )
}

const emitRoomOperation = (
  socket: RealtimeSocket,
  event: RoomEvent,
  mapId: string,
): Promise<RoomAcknowledgement> => {
  return new Promise((resolve, reject) => {
    socket
      .timeout(ROOM_OPERATION_TIMEOUT_MS)
      .emit(
        event,
        { mapId },
        (timeoutError: Error | null, acknowledgement?: RoomAcknowledgement) => {
          if (timeoutError) {
            reject(new Error(`${event} timed out`))
            return
          }
          if (!isRoomAcknowledgement(acknowledgement)) {
            reject(new Error(`${event} returned an invalid acknowledgement`))
            return
          }
          resolve(acknowledgement)
        },
      )
  })
}

const waitForConnection = (socket: RealtimeSocket): Promise<void> => {
  if (socket.connected) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      socket.off('connect', handleConnect)
      reject(new Error('Socket.IO connection timed out'))
    }, ROOM_OPERATION_TIMEOUT_MS)
    const handleConnect = () => {
      window.clearTimeout(timeout)
      resolve()
    }
    socket.once('connect', handleConnect)
  })
}

export const createMapRoomManager = (socket: RealtimeSocket, connect: () => void) => {
  const subscriptions = new Map<string, MapRoomState>()

  const ensureSubscribed = (mapId: string, state: MapRoomState) => {
    if (state.joined) return Promise.resolve<RoomAcknowledgement>({ success: true })
    if (state.pending) return state.pending

    state.pending = (async () => {
      if (!socket.connected) {
        connect()
        await waitForConnection(socket)
      }
      if (subscriptions.get(mapId) !== state || state.references === 0) {
        return { success: true }
      }

      const acknowledgement = await emitRoomOperation(socket, 'map.subscribe', mapId)
      if (subscriptions.get(mapId) === state) {
        if (acknowledgement.success) state.joined = true
        else subscriptions.delete(mapId)
      }
      return acknowledgement
    })()
      .catch((error: unknown) => {
        if (subscriptions.get(mapId) === state) subscriptions.delete(mapId)
        throw error
      })
      .finally(() => {
        state.pending = undefined
      })

    return state.pending
  }

  const subscribe = (mapId: string) => {
    if (!UUID_PATTERN.test(mapId)) return Promise.resolve(invalidPayloadAcknowledgement())

    const existing = subscriptions.get(mapId)
    if (existing) {
      existing.references += 1
      return ensureSubscribed(mapId, existing)
    }

    const state: MapRoomState = { joined: false, references: 1 }
    subscriptions.set(mapId, state)
    return ensureSubscribed(mapId, state)
  }

  const unsubscribe = async (mapId: string): Promise<RoomAcknowledgement> => {
    if (!UUID_PATTERN.test(mapId)) return invalidPayloadAcknowledgement()

    const state = subscriptions.get(mapId)
    if (!state) return { success: true }
    state.references -= 1
    if (state.references > 0) return { success: true }

    subscriptions.delete(mapId)
    let joined = state.joined
    if (state.pending) {
      try {
        joined = (await state.pending).success
      } catch {
        joined = false
      }
    }
    if (!socket.connected || !joined) return { success: true }
    return await emitRoomOperation(socket, 'map.unsubscribe', mapId)
  }

  const handleConnect = () => {
    for (const [mapId, state] of subscriptions) {
      void ensureSubscribed(mapId, state).catch(() => undefined)
    }
  }

  const handleDisconnect = () => {
    for (const state of subscriptions.values()) state.joined = false
  }

  const clear = () => {
    subscriptions.clear()
  }

  socket.on('connect', handleConnect)
  socket.on('disconnect', handleDisconnect)

  return { clear, subscribe, unsubscribe }
}
