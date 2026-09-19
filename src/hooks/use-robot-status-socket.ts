import type { QueryClient } from '@tanstack/react-query'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { BOTS_ENDPOINTS } from '@/enum/endpoints'
import { ROBOT_CONNECTION_STATUS, ROBOT_OPERATION_STATUS } from '@/enum/robot'
import type { IResponseDataWithPage } from '@/interface/api-response'
import type { IRobotInfo, IRobotStatus } from '@/interface/robots'
import { connectRealtime, disconnectRealtime, reconnectRealtime, socket } from '@/realtime/socket'

type UseRobotStatusSocketParams = {
  activeGroupId?: string
  enabled: boolean
}

const connectionStatuses = Object.values(ROBOT_CONNECTION_STATUS)
const operationStatuses = Object.values(ROBOT_OPERATION_STATUS)

export const isRobotStatus = (status: unknown): status is IRobotStatus => {
  if (!status || typeof status !== 'object') return false

  const value = status as Record<string, unknown>
  return (
    typeof value.robot_id === 'string' &&
    (typeof value.ip_address === 'string' || value.ip_address === null) &&
    typeof value.connection_status === 'string' &&
    connectionStatuses.includes(value.connection_status) &&
    typeof value.operational_status === 'string' &&
    operationStatuses.includes(value.operational_status) &&
    typeof value.last_seen_at === 'string'
  )
}

export const applyRobotStatusEvent = (queryClient: QueryClient, status: IRobotStatus) => {
  for (const [queryKey, response] of queryClient.getQueriesData<IResponseDataWithPage<IRobotInfo>>({
    queryKey: [BOTS_ENDPOINTS.LIST],
  })) {
    if (!response) continue
    let updated = false
    const items = response.items.map((robot) => {
      if (robot.id !== status.robot_id) return robot
      updated = true
      return {
        ...robot,
        ip_address: status.ip_address,
        connection_status: status.connection_status,
        operational_status: status.operational_status,
        last_seen_at: status.last_seen_at,
      }
    })
    if (updated) queryClient.setQueryData(queryKey, { ...response, items })
  }
}

export const useRobotStatusSocket = ({ activeGroupId, enabled }: UseRobotStatusSocketParams) => {
  const queryClient = useQueryClient()
  const connectedGroupId = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    const handleRobotStatus = (status: IRobotStatus) => {
      if (isRobotStatus(status)) applyRobotStatusEvent(queryClient, status)
    }
    const handleConnect = () => {
      void queryClient.invalidateQueries({ queryKey: [BOTS_ENDPOINTS.LIST] })
    }

    socket.on('robot.status', handleRobotStatus)
    socket.on('connect', handleConnect)
    return () => {
      socket.off('robot.status', handleRobotStatus)
      socket.off('connect', handleConnect)
    }
  }, [queryClient])

  useEffect(() => {
    if (!enabled) {
      connectedGroupId.current = undefined
      disconnectRealtime()
      return
    }

    const nextGroupId = activeGroupId ?? null
    if (connectedGroupId.current === undefined) {
      connectRealtime()
    } else if (connectedGroupId.current !== nextGroupId) {
      reconnectRealtime()
    }
    connectedGroupId.current = nextGroupId
  }, [activeGroupId, enabled])

  useEffect(
    () => () => {
      connectedGroupId.current = undefined
      disconnectRealtime()
    },
    [],
  )
}
