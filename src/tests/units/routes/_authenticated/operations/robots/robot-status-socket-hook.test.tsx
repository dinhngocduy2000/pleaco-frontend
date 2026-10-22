import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BOTS_ENDPOINTS } from '@/enum/endpoints'
import { ROBOT_CONNECTION_STATUS, ROBOT_OPERATION_STATUS, RobotModel } from '@/enum/robot'

const realtime = vi.hoisted(() => {
  const instances: Array<{
    onMapSubscribed?: () => void
    release: ReturnType<typeof vi.fn>
  }> = []
  const listeners = new Map<string, Set<(payload?: unknown) => void>>()
  const connection = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    socket: {
      connected: false,
      emit: (event: string, payload?: unknown) => {
        for (const listener of listeners.get(event) ?? []) listener(payload)
      },
      off: vi.fn((event: string, listener: (payload?: unknown) => void) => {
        listeners.get(event)?.delete(listener)
      }),
      on: vi.fn((event: string, listener: (payload?: unknown) => void) => {
        const eventListeners = listeners.get(event) ?? new Set()
        eventListeners.add(listener)
        listeners.set(event, eventListeners)
      }),
    },
    subscribeToMap: vi.fn().mockResolvedValue({ success: true }),
    unsubscribeFromMap: vi.fn().mockResolvedValue({ success: true }),
  }
  return { connection, instances, listeners }
})

vi.mock('@/realtime/socket', () => ({
  acquireRealtimeConnection: (onMapSubscribed?: () => void) => {
    const instance = { onMapSubscribed, release: vi.fn() }
    realtime.instances.push(instance)
    return { connection: realtime.connection, release: instance.release }
  },
}))

import { useGroupRobotStatusSocket, useMapRobotStatusSocket } from '@/hooks/use-robot-status-socket'

const createWrapper = (client: QueryClient) => {
  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

describe('robot status socket hooks', () => {
  beforeEach(() => {
    realtime.instances.length = 0
    realtime.listeners.clear()
    vi.clearAllMocks()
  })

  it('opens a group connection only with an enabled, defined active group and replaces it on change', () => {
    const client = new QueryClient()
    const { rerender } = renderHook(
      ({ activeGroupId, enabled }: { activeGroupId?: string; enabled: boolean }) =>
        useGroupRobotStatusSocket({ activeGroupId, enabled }),
      {
        initialProps: { activeGroupId: undefined as string | undefined, enabled: true },
        wrapper: createWrapper(client),
      },
    )

    expect(realtime.instances).toHaveLength(0)
    rerender({ activeGroupId: 'group-1', enabled: true })
    expect(realtime.instances).toHaveLength(1)
    expect(realtime.connection.connect).toHaveBeenCalledOnce()

    rerender({ activeGroupId: 'group-2', enabled: true })
    expect(realtime.instances).toHaveLength(2)
    expect(realtime.instances[0].release).toHaveBeenCalledOnce()
    expect(realtime.connection.connect).toHaveBeenCalledTimes(2)

    rerender({ activeGroupId: 'group-2', enabled: false })
    expect(realtime.instances[1].release).toHaveBeenCalledOnce()
  })

  it('refreshes the robot snapshot when group ownership resumes on an already-connected socket', () => {
    const client = new QueryClient()
    const invalidateQueries = vi.spyOn(client, 'invalidateQueries')
    realtime.connection.socket.connected = true

    renderHook(() => useGroupRobotStatusSocket({ activeGroupId: 'group-1', enabled: true }), {
      wrapper: createWrapper(client),
    })

    expect(realtime.connection.connect).not.toHaveBeenCalled()
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: [BOTS_ENDPOINTS.LIST] })
  })

  it('waits for active group context before opening a map connection', async () => {
    const client = new QueryClient()
    const { rerender } = renderHook(
      ({ activeGroupId }: { activeGroupId?: string }) =>
        useMapRobotStatusSocket({ enabled: true, activeGroupId, mapId: 'map-123' }),
      {
        initialProps: { activeGroupId: undefined as string | undefined },
        wrapper: createWrapper(client),
      },
    )

    expect(realtime.instances).toHaveLength(0)
    rerender({ activeGroupId: 'group-1' })
    expect(realtime.instances).toHaveLength(1)
    rerender({ activeGroupId: 'group-2' })
    expect(realtime.instances).toHaveLength(2)
    await waitFor(() => expect(realtime.instances[0].release).toHaveBeenCalledOnce())
  })

  it('subscribes the map URL ID, refreshes after connect and join, and leaves on unmount', async () => {
    const client = new QueryClient()
    const invalidateQueries = vi.spyOn(client, 'invalidateQueries')
    const { unmount } = renderHook(
      () =>
        useMapRobotStatusSocket({
          activeGroupId: 'group-1',
          enabled: true,
          mapId: 'map-123',
        }),
      { wrapper: createWrapper(client) },
    )
    const instance = realtime.instances[0]

    expect(realtime.connection.subscribeToMap).toHaveBeenCalledWith('map-123')
    await waitFor(() => expect(instance.onMapSubscribed).toBeDefined())

    act(() => realtime.connection.socket.emit('connect'))
    instance.onMapSubscribed?.()
    expect(invalidateQueries).toHaveBeenCalledTimes(2)

    unmount()
    await waitFor(() =>
      expect(realtime.connection.unsubscribeFromMap).toHaveBeenCalledWith('map-123'),
    )
    await waitFor(() => expect(instance.release).toHaveBeenCalledOnce())
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
    renderHook(() => useGroupRobotStatusSocket({ activeGroupId: 'group-1', enabled: true }), {
      wrapper: createWrapper(client),
    })
    const socket = realtime.connection.socket

    act(() => socket.emit('robot.status', { robot_id: 'robot-1' }))
    expect(
      client.getQueryData<{ items: Array<{ connection_status: string }> }>(key)?.items[0]
        .connection_status,
    ).toBe(ROBOT_CONNECTION_STATUS.OFFLINE)

    act(() =>
      socket.emit('robot.status', {
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
})
