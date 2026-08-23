import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BOTS_ENDPOINTS } from '@/enum/endpoints'
import { RobotModel } from '@/enum/robot'

const post = vi.hoisted(() => vi.fn())

vi.mock('@/api', () => ({ default: { post } }))

import { createRobotApi } from '@/api/robots'

describe('createRobotApi', () => {
  beforeEach(() => {
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
})
