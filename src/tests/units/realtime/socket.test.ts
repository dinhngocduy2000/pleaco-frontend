import { beforeEach, describe, expect, it, vi } from 'vitest'

const socketClient = vi.hoisted(() => {
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
  return {
    io: vi.fn(() => socket),
    socket,
  }
})

vi.mock('socket.io-client', () => ({ io: socketClient.io }))
vi.mock('@/lib/env-const', () => ({
  ENV_CONFIGS: { VITE_API_ENDPOINT: 'https://api.example.test/api/v1' },
}))

import { connectRealtime, disconnectRealtime, reconnectRealtime } from '@/realtime/socket'

describe('realtime socket', () => {
  beforeEach(() => {
    socketClient.socket.connect.mockClear()
    socketClient.socket.disconnect.mockClear()
    socketClient.socket.active = false
  })

  it('creates one credentialed root-namespace client with the Socket.IO transport path', () => {
    expect(socketClient.io).toHaveBeenCalledWith('https://api.example.test', {
      path: '/api/v1/ws',
      withCredentials: true,
      autoConnect: false,
    })
  })

  it('connects idempotently and supports explicit disconnect and reconnect', () => {
    connectRealtime()
    expect(socketClient.socket.connect).toHaveBeenCalledOnce()

    socketClient.socket.active = true
    connectRealtime()
    expect(socketClient.socket.connect).toHaveBeenCalledOnce()

    disconnectRealtime()
    expect(socketClient.socket.disconnect).toHaveBeenCalledOnce()

    reconnectRealtime()
    expect(socketClient.socket.disconnect).toHaveBeenCalledTimes(2)
    expect(socketClient.socket.connect).toHaveBeenCalledTimes(2)
  })
})
