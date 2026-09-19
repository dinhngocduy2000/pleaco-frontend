import type { Socket } from 'socket.io-client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMapRoomManager } from '@/realtime/map-rooms'
import type {
  ClientToServerEvents,
  RoomAcknowledgement,
  ServerToClientEvents,
} from '@/realtime/types'

const MAP_ID = '123e4567-e89b-12d3-a456-426614174000'

type EventListener = () => void

const createSocketHarness = () => {
  const listeners = new Map<string, Set<EventListener>>()
  const acknowledgements: Array<{
    acknowledgement?: RoomAcknowledgement
    error: Error | null
  }> = []
  const socket = {
    active: true,
    connected: true,
    emit: vi.fn(
      (
        _event: string,
        _payload: { mapId: string },
        acknowledge: (error: Error | null, acknowledgement?: RoomAcknowledgement) => void,
      ) => {
        const response = acknowledgements.shift() ?? {
          acknowledgement: { success: true } as const,
          error: null,
        }
        acknowledge(response.error, response.acknowledgement)
      },
    ),
    off: vi.fn((event: string, listener: EventListener) => listeners.get(event)?.delete(listener)),
    on: vi.fn((event: string, listener: EventListener) => {
      const eventListeners = listeners.get(event) ?? new Set<EventListener>()
      eventListeners.add(listener)
      listeners.set(event, eventListeners)
    }),
    once: vi.fn((event: string, listener: EventListener) => {
      const wrappedListener = () => {
        listeners.get(event)?.delete(wrappedListener)
        listener()
      }
      const eventListeners = listeners.get(event) ?? new Set<EventListener>()
      eventListeners.add(wrappedListener)
      listeners.set(event, eventListeners)
    }),
    timeout: vi.fn(),
  }
  socket.timeout.mockReturnValue(socket)

  return {
    acknowledgements,
    socket,
    trigger: (event: string) => {
      for (const listener of [...(listeners.get(event) ?? [])]) listener()
    },
  }
}

describe('map room manager', () => {
  const connect = vi.fn()

  beforeEach(() => vi.clearAllMocks())

  it('rejects invalid map IDs locally without requesting arbitrary room access', async () => {
    const harness = createSocketHarness()
    const manager = createMapRoomManager(
      harness.socket as unknown as Socket<ServerToClientEvents, ClientToServerEvents>,
      connect,
    )

    await expect(manager.subscribe('not-a-uuid')).resolves.toEqual({
      success: false,
      error: 'INVALID_PAYLOAD',
    })
    expect(harness.socket.emit).not.toHaveBeenCalled()
  })

  it('reference-counts duplicate consumers and leaves after the final unsubscribe', async () => {
    const harness = createSocketHarness()
    const manager = createMapRoomManager(
      harness.socket as unknown as Socket<ServerToClientEvents, ClientToServerEvents>,
      connect,
    )

    await Promise.all([manager.subscribe(MAP_ID), manager.subscribe(MAP_ID)])
    expect(harness.socket.emit).toHaveBeenCalledTimes(1)
    expect(harness.socket.emit).toHaveBeenLastCalledWith(
      'map.subscribe',
      { mapId: MAP_ID },
      expect.any(Function),
    )

    await manager.unsubscribe(MAP_ID)
    expect(harness.socket.emit).toHaveBeenCalledTimes(1)
    await manager.unsubscribe(MAP_ID)
    expect(harness.socket.emit).toHaveBeenLastCalledWith(
      'map.unsubscribe',
      { mapId: MAP_ID },
      expect.any(Function),
    )
  })

  it('restores desired rooms after a transient Socket.IO reconnect', async () => {
    const harness = createSocketHarness()
    const manager = createMapRoomManager(
      harness.socket as unknown as Socket<ServerToClientEvents, ClientToServerEvents>,
      connect,
    )
    await manager.subscribe(MAP_ID)

    harness.socket.connected = false
    harness.trigger('disconnect')
    harness.socket.connected = true
    harness.trigger('connect')
    await vi.waitFor(() => expect(harness.socket.emit).toHaveBeenCalledTimes(2))

    expect(harness.socket.emit).toHaveBeenLastCalledWith(
      'map.subscribe',
      { mapId: MAP_ID },
      expect.any(Function),
    )
  })

  it('clears desired rooms before an explicit application disconnect', async () => {
    const harness = createSocketHarness()
    const manager = createMapRoomManager(
      harness.socket as unknown as Socket<ServerToClientEvents, ClientToServerEvents>,
      connect,
    )
    await manager.subscribe(MAP_ID)

    manager.clear()
    harness.socket.connected = false
    harness.trigger('disconnect')
    harness.socket.connected = true
    harness.trigger('connect')

    expect(harness.socket.emit).toHaveBeenCalledTimes(1)
  })

  it('queues a desired room while disconnected and joins it after connection', async () => {
    const harness = createSocketHarness()
    harness.socket.connected = false
    const manager = createMapRoomManager(
      harness.socket as unknown as Socket<ServerToClientEvents, ClientToServerEvents>,
      connect,
    )

    const subscription = manager.subscribe(MAP_ID)
    expect(connect).toHaveBeenCalledOnce()
    expect(harness.socket.emit).not.toHaveBeenCalled()

    harness.socket.connected = true
    harness.trigger('connect')
    await expect(subscription).resolves.toEqual({ success: true })
    expect(harness.socket.emit).toHaveBeenCalledWith(
      'map.subscribe',
      { mapId: MAP_ID },
      expect.any(Function),
    )
  })

  it('rejects timed-out and malformed acknowledgements', async () => {
    const timeoutHarness = createSocketHarness()
    timeoutHarness.acknowledgements.push({ error: new Error('timeout') })
    const timeoutManager = createMapRoomManager(
      timeoutHarness.socket as unknown as Socket<ServerToClientEvents, ClientToServerEvents>,
      connect,
    )
    await expect(timeoutManager.subscribe(MAP_ID)).rejects.toThrow('map.subscribe timed out')

    const malformedHarness = createSocketHarness()
    malformedHarness.acknowledgements.push({
      acknowledgement: { success: false, error: 'UNKNOWN_ERROR' } as RoomAcknowledgement,
      error: null,
    })
    const malformedManager = createMapRoomManager(
      malformedHarness.socket as unknown as Socket<ServerToClientEvents, ClientToServerEvents>,
      connect,
    )
    await expect(malformedManager.subscribe(MAP_ID)).rejects.toThrow(
      'map.subscribe returned an invalid acknowledgement',
    )
  })
})
