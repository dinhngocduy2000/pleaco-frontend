import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BOTS_ENDPOINTS } from '@/enum/endpoints'
import { ROBOT_CONNECTION_STATUS, ROBOT_OPERATION_STATUS, RobotModel } from '@/enum/robot'

class MockWebSocket {
  static instances: MockWebSocket[] = []
  close = vi.fn()
  onclose: (() => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null

  constructor(public url: string) {
    MockWebSocket.instances.push(this)
  }
}

vi.mock('@/lib/env-const', () => ({
  ENV_CONFIGS: { VITE_API_ENDPOINT: 'http://api.example.test/v1' },
}))

import { useRobotStatusWebSocket } from '@/hooks/use-robot-status-websocket'

function createWrapper(client: QueryClient) {
  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

describe('useRobotStatusWebSocket', () => {
  beforeEach(() => {
    MockWebSocket.instances = []
    vi.stubGlobal('WebSocket', MockWebSocket)
  })

  afterEach(() => vi.unstubAllGlobals())

  it('connects when enabled and applies valid status events to robot-list cache', () => {
    const client = new QueryClient()
    const key = [BOTS_ENDPOINTS.LIST, { group_id: 'group-1' }]
    client.setQueryData(key, {
      items: [{ id: 'robot-1', name: 'Milo', serial_num: 'PLC-001', model: RobotModel.LITE }],
      total: 1,
    })
    const { unmount } = renderHook(() => useRobotStatusWebSocket(true), {
      wrapper: createWrapper(client),
    })

    expect(MockWebSocket.instances[0]?.url).toBe('ws://api.example.test/v1/realtime/robots')
    act(() => {
      MockWebSocket.instances[0]?.onmessage?.({
        data: JSON.stringify({
          type: 'robot.status.changed',
          data: {
            robot_id: 'robot-1',
            ip_address: '192.168.1.10',
            connection_status: ROBOT_CONNECTION_STATUS.ONLINE,
            operational_status: ROBOT_OPERATION_STATUS.CHARGING,
            last_seen_at: '2026-09-01T00:00:00Z',
          },
        }),
      } as MessageEvent)
    })

    expect(
      client.getQueryData<{ items: Array<{ connection_status: string; ip_address: string }> }>(key)
        ?.items[0],
    ).toMatchObject({
      connection_status: ROBOT_CONNECTION_STATUS.ONLINE,
      ip_address: '192.168.1.10',
    })
    unmount()
    expect(MockWebSocket.instances[0]?.close).toHaveBeenCalledOnce()
  })

  it('does not create a connection when realtime updates are disabled', () => {
    const client = new QueryClient()
    renderHook(() => useRobotStatusWebSocket(false), { wrapper: createWrapper(client) })

    expect(MockWebSocket.instances).toHaveLength(0)
  })
})
