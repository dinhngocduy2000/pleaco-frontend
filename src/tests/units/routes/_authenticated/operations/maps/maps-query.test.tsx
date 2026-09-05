import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MAPS_ENDPOINTS } from '@/enum/endpoints'
import { MapOrderDirection, MapStatus } from '@/enum/maps'

const createMapApi = vi.hoisted(() => vi.fn())
const getMapsApi = vi.hoisted(() => vi.fn())
const saveMapBoundariesApi = vi.hoisted(() => vi.fn())

vi.mock('@/api/maps', () => ({ createMapApi, getMapsApi, saveMapBoundariesApi }))

import {
  getMapListQueryKey,
  getMapsQueryKey,
  useCreateMapMutation,
  useSaveMapBoundariesMutation,
} from '@/queries/use-maps-query'

describe('useCreateMapMutation', () => {
  beforeEach(() => {
    createMapApi.mockReset()
    getMapsApi.mockReset()
    saveMapBoundariesApi.mockReset()
  })

  it('creates a map and invalidates all map lists', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const payload = {
      group_id: 'group-123',
      name: 'Warehouse',
      dimension_x: 20,
      dimension_y: 12,
      robot_ids: [],
      tags: [],
    }
    createMapApi.mockResolvedValue({ data: undefined, message: 'Created', statusCode: 201 })

    const { result } = renderHook(() => useCreateMapMutation(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync(payload)
    })

    expect(createMapApi).toHaveBeenCalledWith(payload, expect.anything())
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: [MAPS_ENDPOINTS.LIST] })
  })

  it('uses the map list endpoint as the future list query key', () => {
    expect(getMapsQueryKey()).toEqual([MAPS_ENDPOINTS.LIST])
  })

  it('saves a boundary and waits for map-list invalidation', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    let finishInvalidation: VoidFunction = () => undefined
    const invalidation = new Promise<void>((resolve) => {
      finishInvalidation = resolve
    })
    const invalidateQueries = vi
      .spyOn(queryClient, 'invalidateQueries')
      .mockReturnValue(invalidation)
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const payload = { map_id: 'map-123', source: 'DIMENSIONS' }
    saveMapBoundariesApi.mockResolvedValue(undefined)
    const { result } = renderHook(() => useSaveMapBoundariesMutation(), { wrapper })

    let mutationSettled = false
    let mutation: Promise<void>
    await act(async () => {
      mutation = result.current.mutateAsync(payload as never).then(() => {
        mutationSettled = true
      })
      await Promise.resolve()
    })

    expect(saveMapBoundariesApi).toHaveBeenCalledWith(payload, expect.anything())
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: [MAPS_ENDPOINTS.LIST] })
    expect(mutationSettled).toBe(false)

    await act(async () => {
      finishInvalidation()
      await mutation
    })
    expect(mutationSettled).toBe(true)
  })

  it('includes every paginated list parameter in the list query key', () => {
    const params = {
      page: 2,
      page_size: 10,
      search: 'Warehouse',
      status: MapStatus.UNASSIGNED,
      tag_ids: ['tag-1'],
      order_direction: MapOrderDirection.ASC,
    }

    expect(getMapListQueryKey(params)).toEqual([MAPS_ENDPOINTS.LIST, params])
  })
})
