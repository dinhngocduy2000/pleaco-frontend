import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MAPS_ENDPOINTS } from '@/enum/endpoints'
import { MapOrderDirection, MapStatus } from '@/enum/maps'

const get = vi.hoisted(() => vi.fn())
const post = vi.hoisted(() => vi.fn())

vi.mock('@/api', () => ({ default: { get, post } }))

import { createMapApi, getMapsApi } from '@/api/maps'

describe('createMapApi', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
  })

  it('posts the complete create-map payload to the maps endpoint', async () => {
    const payload = {
      group_id: '00000000-0000-4000-8000-000000000010',
      name: 'Warehouse — Floor 1',
      description: 'Main warehouse floor',
      dimension_x: 20,
      dimension_y: 12.5,
      robot_ids: [],
      tags: ['00000000-0000-4000-8000-000000000001'],
    }
    post.mockResolvedValue({ data: undefined, message: 'Created', statusCode: 201 })

    await createMapApi(payload)

    expect(post).toHaveBeenCalledWith(MAPS_ENDPOINTS.CREATE, payload)
  })

  it('gets a paginated, filtered map list with cancellation support', async () => {
    const params = {
      page: 2,
      page_size: 10,
      search: 'Warehouse',
      status: MapStatus.ASSIGNED,
      tag_ids: ['00000000-0000-4000-8000-000000000001'],
      order_direction: MapOrderDirection.DESC,
    }
    const signal = new AbortController().signal
    get.mockResolvedValue({ items: [], page: 2, page_size: 10, total: 0, message: 'OK' })

    await getMapsApi(params, signal)

    expect(get).toHaveBeenCalledWith(
      MAPS_ENDPOINTS.LIST,
      expect.objectContaining({ params, signal, paramsSerializer: expect.any(Function) }),
    )
    const [, requestConfig] = get.mock.calls[0] as [
      string,
      { paramsSerializer: (requestParams: unknown) => string },
    ]
    expect(requestConfig.paramsSerializer(params)).toContain(
      'tag_ids=00000000-0000-4000-8000-000000000001',
    )
  })
})
