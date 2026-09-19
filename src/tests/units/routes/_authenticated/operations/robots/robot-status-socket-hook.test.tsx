import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BOTS_ENDPOINTS } from '@/enum/endpoints'
import { ROBOT_CONNECTION_STATUS, ROBOT_OPERATION_STATUS, RobotModel } from '@/enum/robot'

const realtime = vi.hoisted(() => {
  const listeners = new Map<string, Set<(payload?: unknown) => void>>()
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    emit: (event: string, payload?: unknown) => {
      for (const listener of listeners.get(event) ?? []) listener(payload)
    },
    listeners,
    reconnect: vi.fn(),
    socket: {
      on: vi.fn((event: string, listener: (payload?: unknown) => void) => {
        const eventListeners = listeners.get(event) ?? new Set()
        eventListeners.add(listener)
        listeners.set(event, eventListeners)
      }),
      off: vi.fn((event: string, listener: (payload?: unknown) => void) => {
        listeners.get(event)?.delete(listener)
      }),
    },
  }
})

vi.mock('@/realtime/socket', () => ({
  connectRealtime: realtime.connect,
  disconnectRealtime: realtime.disconnect,
  reconnectRealtime: realtime.reconnect,
  socket: realtime.socket,
}))

import { useRobotStatusSocket } from '@/hooks/use-robot-status-socket'

const createWrapper = (client: QueryClient) => {
  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

describe('useRobotStatusSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    realtime.listeners.clear()
  })

  it('waits for profile readiness and reconnects only when the active group changes', () => {
    const client = new QueryClient()
    const { rerender, unmount } = renderHook(
      ({ activeGroupId, enabled }: { activeGroupId?: string; enabled: boolean }) =>
        useRobotStatusSocket({ activeGroupId, enabled }),
      {
        initialProps: { activeGroupId: undefined, enabled: false },
        wrapper: createWrapper(client),
      },
    )

    expect(realtime.connect).not.toHaveBeenCalled()
    rerender({ activeGroupId: undefined, enabled: true })
    expect(realtime.connect).toHaveBeenCalledOnce()

    rerender({ activeGroupId: undefined, enabled: true })
    expect(realtime.reconnect).not.toHaveBeenCalled()
    rerender({ activeGroupId: 'group-1', enabled: true })
    expect(realtime.reconnect).toHaveBeenCalledOnce()
    rerender({ activeGroupId: 'group-1', enabled: true })
    expect(realtime.reconnect).toHaveBeenCalledOnce()

    unmount()
    expect(realtime.disconnect).toHaveBeenCalled()
  })

  it('applies valid status events and ignores malformed payloads', () => {
    const client = new QueryClient()
    const key = [BOTS_ENDPOINTS.LIST, { group_id: 'group-1' }]
    client.setQueryData(key, {
      items: [
        {
          id: 'robot-1',
          name: 'Milo',
          serial_num: 'PLC-001',
          model: RobotModel.LITE,
          ip_address: null,
          operational_status: ROBOT_OPERATION_STATUS.IDLE,
          connection_status: ROBOT_CONNECTION_STATUS.OFFLINE,
          created_at: '2026-09-01T00:00:00Z',
          tags: [],
        },
      ],
      total: 1,
    })
    renderHook(() => useRobotStatusSocket({ activeGroupId: 'group-1', enabled: true }), {
      wrapper: createWrapper(client),
    })

    act(() => realtime.emit('robot.status', { robot_id: 'robot-1' }))
    expect(
      client.getQueryData<{ items: Array<{ connection_status: string }> }>(key)?.items[0]
        .connection_status,
    ).toBe(ROBOT_CONNECTION_STATUS.OFFLINE)

    act(() =>
      realtime.emit('robot.status', {
        robot_id: 'robot-1',
        ip_address: '192.168.1.10',
        connection_status: ROBOT_CONNECTION_STATUS.ONLINE,
        operational_status: ROBOT_OPERATION_STATUS.CHARGING,
        last_seen_at: '2026-09-01T00:00:00Z',
      }),
    )
    expect(
      client.getQueryData<{ items: Array<{ connection_status: string; ip_address: string }> }>(key)
        ?.items[0],
    ).toMatchObject({
      connection_status: ROBOT_CONNECTION_STATUS.ONLINE,
      ip_address: '192.168.1.10',
    })
  })

  it('invalidates robot lists after each successful connection', () => {
    const client = new QueryClient()
    const invalidateQueries = vi.spyOn(client, 'invalidateQueries')
    renderHook(() => useRobotStatusSocket({ enabled: true }), {
      wrapper: createWrapper(client),
    })

    act(() => realtime.emit('connect'))

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: [BOTS_ENDPOINTS.LIST] })
  })
})
