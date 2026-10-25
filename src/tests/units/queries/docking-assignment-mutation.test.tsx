import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { MAPS_ENDPOINTS } from '@/enum/endpoints'

const { assignDockingStationRobotApi } = vi.hoisted(() => ({
  assignDockingStationRobotApi: vi.fn(),
}))
vi.mock('@/api/maps', () => ({
  assignDockingStationRobotApi,
  createMapApi: vi.fn(),
  getMapDetailApi: vi.fn(),
  getMapsApi: vi.fn(),
  saveMapLayoutApi: vi.fn(),
  updateMapMetadataApi: vi.fn(),
}))

import { useAssignDockingStationRobotMutation } from '@/queries/use-maps-query'

const request = { map_id: 'map-1', docking_id: 'station-1', robot_id: 'robot-1' }

describe('docking station assignment mutation', () => {
  it('waits for map detail refetch before reporting success', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    let finishRefetch: ((value: { revision: number }) => void) | undefined
    const fetchDetail = vi
      .fn()
      .mockResolvedValueOnce({ revision: 1 })
      .mockImplementationOnce(
        () => new Promise<{ revision: number }>((resolve) => (finishRefetch = resolve)),
      )
    const detailKey = [MAPS_ENDPOINTS.DETAIL, 'map-1', 'group-1']
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    assignDockingStationRobotApi.mockResolvedValue(undefined)
    const detail = renderHook(() => useQuery({ queryKey: detailKey, queryFn: fetchDetail }), {
      wrapper,
    })
    await waitFor(() => expect(detail.result.current.data).toEqual({ revision: 1 }))
    const onSuccess = vi.fn()
    const mutation = renderHook(() => useAssignDockingStationRobotMutation({ onSuccess }), {
      wrapper,
    })

    let mutationPromise: Promise<void> | undefined
    act(() => {
      mutationPromise = mutation.result.current.mutateAsync(request)
    })
    await waitFor(() => expect(fetchDetail).toHaveBeenCalledTimes(2))
    expect(onSuccess).not.toHaveBeenCalled()
    expect(mutationPromise).toBeDefined()

    await act(async () => {
      finishRefetch?.({ revision: 2 })
      await mutationPromise
    })

    await waitFor(() => expect(detail.result.current.data).toEqual({ revision: 2 }))
    expect(onSuccess).toHaveBeenCalledWith(undefined, request)
  })
})
