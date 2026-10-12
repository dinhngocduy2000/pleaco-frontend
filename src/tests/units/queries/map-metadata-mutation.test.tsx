import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MAPS_ENDPOINTS } from '@/enum/endpoints'

const put = vi.hoisted(() => vi.fn())
vi.mock('@/api/index', () => ({ default: { put } }))

import { updateMapMetadataApi } from '@/api/maps'
import { useUpdateMapMetadataMutation } from '@/queries/use-maps-query'

const request = { map_id: 'map-1', name: 'Updated', description: '', tags: [] }

function setup() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const listKey = [MAPS_ENDPOINTS.LIST, { page: 1 }]
  const detailKey = [MAPS_ENDPOINTS.DETAIL, request.map_id, 'group-1']
  client.setQueryData(listKey, { data: [] })
  client.setQueryData(detailKey, { data: { name: 'Original' } })
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, listKey, detailKey, wrapper }
}

describe('map metadata update', () => {
  beforeEach(() => {
    put.mockReset()
  })

  it('puts metadata without map_id and ignores the acknowledgement body', async () => {
    put.mockResolvedValue('Updated successfully')
    await expect(updateMapMetadataApi(request)).resolves.toBeUndefined()
    expect(put).toHaveBeenCalledWith('/maps/map-1', { name: 'Updated', description: '', tags: [] })
  })

  it('preserves nullable and omitted optional fields at the API boundary', async () => {
    await updateMapMetadataApi({ map_id: 'map-1', name: 'Map', tags: null, description: null })
    expect(put).toHaveBeenLastCalledWith('/maps/map-1', {
      name: 'Map',
      tags: null,
      description: null,
    })
    await updateMapMetadataApi({ map_id: 'map-1', name: 'Map' })
    expect(put).toHaveBeenLastCalledWith('/maps/map-1', { name: 'Map' })
  })

  it('invalidates cached lists and tenant-scoped detail before calling onSuccess', async () => {
    const { client, listKey, detailKey, wrapper } = setup()
    const onSuccess = vi.fn(() => {
      expect(client.getQueryState(listKey)?.isInvalidated).toBe(true)
      expect(client.getQueryState(detailKey)?.isInvalidated).toBe(true)
    })
    const { result } = renderHook(() => useUpdateMapMetadataMutation({ onSuccess }), { wrapper })
    await act(async () => {
      await result.current.mutateAsync(request)
    })
    expect(onSuccess).toHaveBeenCalledWith(undefined, request)
  })

  it('preserves cached data and reports failures without invalidation', async () => {
    const { client, listKey, detailKey, wrapper } = setup()
    const error = new Error('Offline')
    put.mockRejectedValue(error)
    const onError = vi.fn()
    const onSuccess = vi.fn()
    const { result } = renderHook(() => useUpdateMapMetadataMutation({ onSuccess, onError }), {
      wrapper,
    })
    await act(async () => {
      await expect(result.current.mutateAsync(request)).rejects.toThrow('Offline')
    })
    expect(client.getQueryState(listKey)?.isInvalidated).toBe(false)
    expect(client.getQueryState(detailKey)?.isInvalidated).toBe(false)
    expect(client.getQueryData(detailKey)).toEqual({ data: { name: 'Original' } })
    expect(onError).toHaveBeenCalledWith(error, request, undefined, expect.anything())
    expect(onSuccess).not.toHaveBeenCalled()
  })
})
