import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BOTS_ENDPOINTS } from '@/enum/endpoints'
import { RobotModel } from '@/enum/robot'

const get = vi.hoisted(() => vi.fn())
const post = vi.hoisted(() => vi.fn())

vi.mock('@/api', () => ({ default: { get, post } }))

import { createRobotApi, getRobotsApi } from '@/api/robots'

describe('createRobotApi', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
  })

  it('posts the complete BotCreateDTO-shaped payload to the bots endpoint', async () => {
    const payload = {
      group_id: '00000000-0000-4000-8000-000000000010',
      name: 'Pleaco One',
      serial_num: 'PL-2026-0042',
      model: RobotModel.PRO,
      map_id: null,
      ip_address: '2001:db8::1',
      tags: ['00000000-0000-4000-8000-000000000001'],
    }
    post.mockResolvedValue({ data: undefined, message: 'Created', statusCode: 201 })

    await createRobotApi(payload)

    expect(post).toHaveBeenCalledWith(BOTS_ENDPOINTS.CREATE, payload)
  })

  it('gets a paginated, filtered bot list with cancellation support', async () => {
    const params = {
      group_id: '00000000-0000-4000-8000-000000000010',
      page: 2,
      page_size: 10,
      search: 'Milo',
      model: RobotModel.PRO,
      operational_status: 'IDLE' as const,
      connection_status: 'ONLINE' as const,
      tag_ids: ['00000000-0000-4000-8000-000000000001'],
    }
    const signal = new AbortController().signal
    get.mockResolvedValue({ items: [], page: 2, page_size: 10, total: 0, message: 'OK' })

    await getRobotsApi(params, signal)

    expect(get).toHaveBeenCalledWith(BOTS_ENDPOINTS.LIST, { params, signal })
  })
})
