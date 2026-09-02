import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BOTS_ENDPOINTS, MAPS_ENDPOINTS } from '@/enum/endpoints'

const mapApi = vi.hoisted(() => ({ createMapApi: vi.fn(), getMapsApi: vi.fn() }))
const robotApi = vi.hoisted(() => ({
  createRobotApi: vi.fn(),
  deleteRobotApi: vi.fn(),
  getRobotsApi: vi.fn(),
  getRobotsKeyValueApi: vi.fn(),
}))
vi.mock('@/api/maps', () => mapApi)
vi.mock('@/api/robots', () => robotApi)

import { useCreateMapMutation, useMapsQuery } from '@/queries/use-maps-query'
import {
  useCreateRobotMutation,
  useRobotsKeyValueQuery,
  useRobotsQuery,
} from '@/queries/use-robots-query'

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, wrapper }
}

describe('maps and robots query hooks', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches maps with list params and query-key extensions', async () => {
    const params = { page: 1, page_size: 10, search: 'Warehouse' }
    mapApi.getMapsApi.mockResolvedValue({ items: [], total: 0 })
    const { client, wrapper } = createWrapper()
    const { result } = renderHook(
      () => useMapsQuery({ params: params as never, queryKey: ['screen'] }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mapApi.getMapsApi).toHaveBeenCalledWith(params, expect.any(AbortSignal))
    expect(client.getQueryData([MAPS_ENDPOINTS.LIST, params, 'screen'])).toEqual({
      items: [],
      total: 0,
    })
  })

  it('creates maps and invalidates every map list', async () => {
    mapApi.createMapApi.mockResolvedValue({ data: undefined })
    const { client, wrapper } = createWrapper()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useCreateMapMutation(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ name: 'Warehouse' } as never)
    })
    expect(mapApi.createMapApi).toHaveBeenCalledWith({ name: 'Warehouse' }, expect.anything())
    expect(invalidate).toHaveBeenCalledWith({ queryKey: [MAPS_ENDPOINTS.LIST] })
  })

  it('fetches paginated robots and key-value options with cancellation signals', async () => {
    const params = { group_id: 'group-1', page: 1, page_size: 10 }
    robotApi.getRobotsApi.mockResolvedValue({ items: [], total: 0 })
    robotApi.getRobotsKeyValueApi.mockResolvedValue({ data: [{ id: 'robot-1', name: 'Milo' }] })
    const { wrapper } = createWrapper()
    const robots = renderHook(() => useRobotsQuery({ params }), { wrapper })
    const options = renderHook(() => useRobotsKeyValueQuery({ queryKey: ['dialog'] }), { wrapper })
    await waitFor(() =>
      expect(robots.result.current.isSuccess && options.result.current.isSuccess).toBe(true),
    )
    expect(robotApi.getRobotsApi).toHaveBeenCalledWith(params, expect.any(AbortSignal))
    expect(robotApi.getRobotsKeyValueApi).toHaveBeenCalledWith(expect.any(AbortSignal))
  })

  it('creates robots and invalidates every robot list', async () => {
    robotApi.createRobotApi.mockResolvedValue({ data: undefined })
    const { client, wrapper } = createWrapper()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useCreateRobotMutation(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ name: 'Milo' } as never)
    })
    expect(robotApi.createRobotApi).toHaveBeenCalledWith({ name: 'Milo' }, expect.anything())
    expect(invalidate).toHaveBeenCalledWith({ queryKey: [BOTS_ENDPOINTS.LIST] })
  })
})
