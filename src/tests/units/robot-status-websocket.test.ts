import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { BOTS_ENDPOINTS } from '@/enum/endpoints'
import { ROBOT_CONNECTION_STATUS, ROBOT_OPERATION_STATUS, RobotModel } from '@/enum/robot'
import { applyRobotStatusEvent } from '@/hooks/use-robot-status-websocket'

describe('applyRobotStatusEvent', () => {
  it('patches only the robot matched by UUID in the robot list cache', () => {
    const queryClient = new QueryClient()
    const key = [BOTS_ENDPOINTS.LIST, { group_id: 'group-1', page: 1 }]
    queryClient.setQueryData(key, {
      items: [
        {
          id: 'robot-a',
          name: 'A',
          serial_num: 'A',
          model: RobotModel.LITE,
          ip_address: '192.168.1.2',
          operational_status: ROBOT_OPERATION_STATUS.IDLE,
          connection_status: ROBOT_CONNECTION_STATUS.OFFLINE,
          created_at: '2026-08-24T00:00:00Z',
        },
        {
          id: 'robot-b',
          name: 'B',
          serial_num: 'B',
          model: RobotModel.PRO,
          ip_address: '192.168.1.3',
          operational_status: ROBOT_OPERATION_STATUS.IDLE,
          connection_status: ROBOT_CONNECTION_STATUS.OFFLINE,
          created_at: '2026-08-24T00:00:00Z',
        },
      ],
      page: 1,
      page_size: 10,
      total: 2,
      message: 'ok',
      statusCode: 200,
    })

    applyRobotStatusEvent(queryClient, {
      type: 'robot.status.changed',
      data: {
        robot_id: 'robot-b',
        ip_address: '192.168.1.31',
        connection_status: ROBOT_CONNECTION_STATUS.ONLINE,
        operational_status: ROBOT_OPERATION_STATUS.CHARGING,
        last_seen_at: '2026-08-24T07:20:00Z',
      },
    })

    const state = queryClient.getQueryData<{
      items: Array<{ id: string; connection_status: string; ip_address: string }>
    }>(key)
    expect(state?.items[0].connection_status).toBe(ROBOT_CONNECTION_STATUS.OFFLINE)
    expect(state?.items[1]).toMatchObject({
      id: 'robot-b',
      connection_status: ROBOT_CONNECTION_STATUS.ONLINE,
      ip_address: '192.168.1.31',
    })
  })
})
