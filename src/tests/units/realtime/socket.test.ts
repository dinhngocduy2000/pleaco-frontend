import { beforeEach, describe, expect, it, vi } from 'vitest'

const socketClient = vi.hoisted(() => {
  const sockets: Array<{
    active: boolean
    connect: ReturnType<typeof vi.fn>
    connected: boolean
    disconnect: ReturnType<typeof vi.fn>
    emit: ReturnType<typeof vi.fn>
    off: ReturnType<typeof vi.fn>
    on: ReturnType<typeof vi.fn>
    once: ReturnType<typeof vi.fn>
    timeout: ReturnType<typeof vi.fn>
  }> = []
  const io = vi.fn(() => {
    const socket = {
      active: false,
      connect: vi.fn(),
      connected: false,
      disconnect: vi.fn(),
      emit: vi.fn(),
      off: vi.fn(),
      on: vi.fn(),
      once: vi.fn(),
      timeout: vi.fn(),
    }
    socket.connect.mockReturnValue(socket)
    socket.disconnect.mockReturnValue(socket)
    socket.timeout.mockReturnValue(socket)
    sockets.push(socket)
    return socket
  })
  return { io, sockets }
})

vi.mock('socket.io-client', () => ({ io: socketClient.io }))
vi.mock('@/lib/env-const', () => ({
  ENV_CONFIGS: { VITE_API_ENDPOINT: 'https://api.example.test/api/v1' },
}))

import { acquireRealtimeConnection, realtimeConnection, socket } from '@/realtime/socket'

describe('global realtime socket', () => {
  beforeEach(() => {
    const mockSocket = socketClient.sockets[0]
    mockSocket.active = false
    mockSocket.connect.mockClear()
    mockSocket.disconnect.mockClear()
    mockSocket.emit.mockClear()
    mockSocket.off.mockClear()
    mockSocket.on.mockClear()
    mockSocket.once.mockClear()
    mockSocket.timeout.mockClear()
  })

  it('creates one credentialed root-namespace client with exponential retry and jitter', () => {
    expect(socketClient.io).toHaveBeenCalledOnce()
    expect(socketClient.io).toHaveBeenCalledWith('https://api.example.test', {
      path: '/api/v1/ws',
      withCredentials: true,
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Number.POSITIVE_INFINITY,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 30_000,
      randomizationFactor: 0.5,
    })
    expect(realtimeConnection.socket).toBe(socket)
  })

  it('returns the same connection instance to every consumer and disconnects after the last release', () => {
    const first = acquireRealtimeConnection()
    const second = acquireRealtimeConnection()

    expect(first.connection).toBe(realtimeConnection)
    expect(second.connection).toBe(first.connection)
    expect(socketClient.io).toHaveBeenCalledOnce()

    first.connection.connect()
    expect(socket.connect).toHaveBeenCalledOnce()

    first.release()
    expect(socket.disconnect).not.toHaveBeenCalled()
    second.release()
    expect(socket.disconnect).toHaveBeenCalledOnce()
  })

  it('makes lease release idempotent', () => {
    const lease = acquireRealtimeConnection()

    lease.release()
    lease.release()

    expect(socket.disconnect).toHaveBeenCalledOnce()
  })
})
