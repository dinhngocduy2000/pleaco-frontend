import { describe, expect, it } from 'vitest'
import { BOTS_ENDPOINTS } from '@/enum/endpoints'
import { RobotModel } from '@/enum/robot'
import { getRobotsQueryKey } from '@/queries/use-robots-query'

describe('getRobotsQueryKey', () => {
  it('includes every paginated list parameter', () => {
    const params = {
      group_id: 'group-123',
      page: 2,
      page_size: 10,
      search: 'Milo',
      model: RobotModel.LITE,
      operational_status: 'IDLE' as const,
      connection_status: 'ONLINE' as const,
      tag_ids: ['tag-1'],
    }

    expect(getRobotsQueryKey(params)).toEqual([BOTS_ENDPOINTS.LIST, params])
  })
})
