import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MAPS_ENDPOINTS } from '@/enum/endpoints'

const post = vi.hoisted(() => vi.fn())

vi.mock('@/api', () => ({ default: { post } }))

import { createMapApi } from '@/api/maps'

describe('createMapApi', () => {
  beforeEach(() => {
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
})
