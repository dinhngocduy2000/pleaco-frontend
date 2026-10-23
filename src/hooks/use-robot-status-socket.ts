import type { QueryClient } from '@tanstack/react-query'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'
import { BOTS_ENDPOINTS } from '@/enum/endpoints'
import { ROBOT_CONNECTION_STATUS, ROBOT_OPERATION_STATUS } from '@/enum/robot'
import type { IResponseDataWithPage } from '@/interface/api-response'
import type { IRobotInfo, IRobotStatus } from '@/interface/robots'
import { acquireRealtimeConnection } from '@/realtime/socket'

type UseGroupRobotStatusSocketParams = {
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

const useRobotStatusEvents = () => {
  const queryClient = useQueryClient()
  const handleRobotStatus = useCallback(
    (status: IRobotStatus) => {
      if (isRobotStatus(status)) applyRobotStatusEvent(queryClient, status)
    },
    [queryClient],
  )
  const handleConnect = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: [BOTS_ENDPOINTS.LIST] })
  }, [queryClient])

  return {
    queryClient,
    handleRobotStatus,
    handleConnect,
  }
}

export const useGroupRobotStatusSocket = ({
  activeGroupId,
  enabled,
}: UseGroupRobotStatusSocketParams) => {
  const { handleRobotStatus, handleConnect } = useRobotStatusEvents()

  useEffect(() => {
    if (!enabled || !activeGroupId) return

    const lease = acquireRealtimeConnection()
    const { connection } = lease
    const handleConnectionError = (error: Error) => {
      console.error('Socket.IO connection failed:', error.message)
    }
    connection.socket.on('robot.status', handleRobotStatus)
    connection.socket.on('connect', handleConnect)
    connection.socket.on('connect_error', handleConnectionError)
    if (connection.socket.connected) handleConnect()
    else connection.connect()

    return () => {
      connection.socket.off('robot.status', handleRobotStatus)
      connection.socket.off('connect', handleConnect)
      connection.socket.off('connect_error', handleConnectionError)
      lease.release()
    }
  }, [activeGroupId, enabled, handleConnect, handleRobotStatus])
}

type UseMapRobotStatusSocketParams = {
  activeGroupId?: string
  enabled: boolean
  mapId: string
}

export const useMapRobotStatusSocket = ({
  activeGroupId,
  enabled,
  mapId,
}: UseMapRobotStatusSocketParams) => {
  const { handleRobotStatus, handleConnect } = useRobotStatusEvents()

  useEffect(() => {
    if (!enabled || !activeGroupId) return

    let disposed = false
    const onMapSubscribed = () => {
      if (!disposed) {
        handleConnect()
      }
    }
    const lease = acquireRealtimeConnection(onMapSubscribed)
    const { connection } = lease
    const { socket } = connection
    const handleConnectionError = (error: Error) => {
      console.error('Socket.IO connection failed:', error.message)
    }
    socket.on('robot.status', handleRobotStatus)
    socket.on('connect', handleConnect)
    socket.on('connect_error', handleConnectionError)

    void connection
      .subscribeToMap(mapId)
      .then((acknowledgement) => {
        if (!disposed && !acknowledgement.success) {
          console.error('Map room subscription failed:', acknowledgement.error)
        }
      })
      .catch((error: unknown) => {
        if (!disposed) console.error('Map room subscription failed:', error)
      })

    return () => {
      disposed = true
      socket.off('robot.status', handleRobotStatus)
      socket.off('connect', handleConnect)
      socket.off('connect_error', handleConnectionError)
      void connection
        .unsubscribeFromMap(mapId)
        .catch((error: unknown) => console.error('Map room unsubscribe failed:', error))
        .finally(lease.release)
    }
  }, [activeGroupId, enabled, handleConnect, handleRobotStatus, mapId])
}
