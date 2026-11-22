import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MapRobotPosition } from '@/api/maps'
import type { IResponseData } from '@/interface/api-response'

const transport = vi.hoisted(() => ({
  listener: undefined as ((event: unknown) => void) | undefined,
  subscribed: undefined as ((mapId: string) => Promise<void>) | undefined,
}))
const getMapRobotPositionsApi = vi.hoisted(() => vi.fn())
vi.mock('@/api/maps', () => ({ getMapRobotPositionsApi }))
vi.mock('@/realtime/socket', () => ({
  acquireRealtimeConnection: (subscribed: (mapId: string) => Promise<void>) => {
    transport.subscribed = subscribed
    return {
      connection: {
        socket: {
          on: (_event: string, listener: (event: unknown) => void) => {
            transport.listener = listener
          },
          off: () => {
            transport.listener = undefined
          },
        },
        subscribeToMap: async () => ({ success: true }),
        unsubscribeFromMap: async () => ({ success: true }),
      },
      release: vi.fn(),
    }
  },
}))

import { useMapRobotPositionsSocket } from '@/hooks/use-map-robot-positions-socket'
import { useMapRobotPositionsQuery } from '@/queries/use-maps-query'

const initialRobot = {
  id: 'robot',
  name: 'Robot',
  position: { x: 1, y: 1, updated_at: '2026-01-01T00:00:00Z' },
}

function emitPosition(x: number, updated_at = '2026-01-01T00:00:02Z') {
  act(() =>
    transport.listener?.({ map_id: 'map', robot_id: 'robot', position: { x, y: 5, updated_at } }),
  )
}

type Snapshot = IResponseData<{ robots: MapRobotPosition[] }>

function snapshot(robots: MapRobotPosition[]): Snapshot {
  return { data: { robots }, message: 'Success', statusCode: 200 }
}

function pendingSnapshot() {
  let resolve!: (value: Snapshot) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<Snapshot>((finish, fail) => {
    resolve = finish
    reject = fail
  })
  return { promise, resolve, reject }
}

const setupSnapshot = () => {
  const client = new QueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  getMapRobotPositionsApi.mockResolvedValueOnce(snapshot([initialRobot]))
  return renderHook(
    () => {
      const query = useMapRobotPositionsQuery('map', 'group')
      const robots = useMapRobotPositionsSocket(
        'map',
        'group',
        query.data?.data.robots ?? [],
        query.data?.requestRevision,
      )
      return { robots, isError: query.isError }
    },
    { wrapper },
  )
}

describe('map robot position events', () => {
  beforeEach(() => getMapRobotPositionsApi.mockReset())

  it('applies newer positions and retains them against an older snapshot', () => {
    const client = new QueryClient()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const initial = [initialRobot]
    const { result, rerender, unmount } = renderHook(
      ({ robots }) => useMapRobotPositionsSocket('map', 'group', robots),
      { wrapper, initialProps: { robots: initial } },
    )
    act(() =>
      transport.listener?.({
        map_id: 'map',
        robot_id: 'robot',
        position: { x: 4, y: 5, updated_at: '2026-01-01T00:00:02Z' },
      }),
    )
    expect(result.current[0].position?.x).toBe(4)
    act(() =>
      transport.listener?.({
        map_id: 'map',
        robot_id: 'robot',
        position: { x: 3, y: 5, updated_at: '2026-01-01T00:00:01Z' },
      }),
    )
    rerender({ robots: initial })
    expect(result.current[0].position?.x).toBe(4)
    act(() =>
      transport.listener?.({
        map_id: 'other',
        robot_id: 'robot',
        position: { x: 9, y: 5, updated_at: '2026-01-01T00:00:03Z' },
      }),
    )
    expect(result.current[0].position?.x).toBe(4)
    unmount()
    expect(transport.listener).toBeUndefined()
  })

  it.each([
    { mapId: 'other-map', groupId: 'group' },
    { mapId: 'map', groupId: 'other-group' },
  ])('discards live positions when switching to and from $groupId/$mapId', (otherScope) => {
    const client = new QueryClient()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const initialScope = { mapId: 'map', groupId: 'group' }
    const { result, rerender } = renderHook(
      ({ mapId, groupId }) => useMapRobotPositionsSocket(mapId, groupId, [initialRobot]),
      { wrapper, initialProps: initialScope },
    )
    emitPosition(4)
    expect(result.current[0].position?.x).toBe(4)

    rerender(otherScope)
    expect(result.current[0].position?.x).toBe(1)
    rerender(initialScope)
    expect(result.current[0].position?.x).toBe(1)
  })

  it('preserves the displayed position during and after a failed rejoin refresh', async () => {
    const { result } = setupSnapshot()
    await waitFor(() => expect(result.current.robots[0].position?.x).toBe(1))
    emitPosition(4)

    const request = pendingSnapshot()
    getMapRobotPositionsApi.mockReturnValueOnce(request.promise)
    act(() => {
      void transport.subscribed?.('map')
    })
    await waitFor(() => expect(getMapRobotPositionsApi).toHaveBeenCalledTimes(2))
    expect(result.current.robots[0].position?.x).toBe(4)

    await act(async () => request.reject(new Error('Refresh failed')))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.robots[0].position?.x).toBe(4)
  })

  it.each([
    { label: 'no robot', robots: [] },
    { label: 'unknown position', robots: [{ ...initialRobot, position: null }] },
    { label: 'dock fallback', robots: [initialRobot] },
  ])('reconciles an expired live position to $label', async ({ robots }) => {
    const { result } = setupSnapshot()
    await waitFor(() => expect(result.current.robots[0].position?.x).toBe(1))
    emitPosition(4)
    expect(result.current.robots[0].position?.x).toBe(4)

    getMapRobotPositionsApi.mockResolvedValueOnce(snapshot(robots))
    await act(async () => transport.subscribed?.('map'))
    await waitFor(() => expect(result.current.robots).toEqual(robots))
  })

  it.each([
    { label: 'unknown', position: null, expectedX: 7 },
    {
      label: 'a dock with a later configuration timestamp',
      position: { ...initialRobot.position, source: 'dock', updated_at: '2026-01-01T00:00:04Z' },
      expectedX: 7,
    },
    {
      label: 'a later confirmed movement',
      position: { x: 8, y: 5, source: 'confirmed', updated_at: '2026-01-01T00:00:04Z' },
      expectedX: 8,
    },
  ] satisfies { label: string; position: MapRobotPosition['position']; expectedX: number }[])(
    'reconciles a position event received during a successful refresh to $label',
    async ({ position, expectedX }) => {
      const { result } = setupSnapshot()
      await waitFor(() => expect(result.current.robots[0].position?.x).toBe(1))
      emitPosition(4)

      const request = pendingSnapshot()
      getMapRobotPositionsApi.mockReturnValueOnce(request.promise)
      act(() => {
        void transport.subscribed?.('map')
      })
      await waitFor(() => expect(getMapRobotPositionsApi).toHaveBeenCalledTimes(2))
      emitPosition(7, '2026-01-01T00:00:03Z')

      await act(async () =>
        request.resolve(snapshot([{ ...initialRobot, name: 'Updated', position }])),
      )
      await waitFor(() => expect(result.current.robots[0].name).toBe('Updated'))
      expect(result.current.robots[0].position?.x).toBe(expectedX)
    },
  )
})
