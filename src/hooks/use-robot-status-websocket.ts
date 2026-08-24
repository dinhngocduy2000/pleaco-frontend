import type { QueryClient } from '@tanstack/react-query'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { BOTS_ENDPOINTS } from '@/enum/endpoints'
import type { IResponseDataWithPage } from '@/interface/api-response'
import type { IRobotInfo } from '@/interface/robots'
import { ENV_CONFIGS } from '@/lib/env-const'

type RobotStatusChangedEvent = {
  type: 'robot.status.changed'
  data: Pick<
    IRobotInfo,
    'ip_address' | 'connection_status' | 'operational_status' | 'last_seen_at'
  > & {
    robot_id: string
  }
}

export const applyRobotStatusEvent = (queryClient: QueryClient, event: RobotStatusChangedEvent) => {
  if (event.type !== 'robot.status.changed') return

  for (const [queryKey, response] of queryClient.getQueriesData<IResponseDataWithPage<IRobotInfo>>({
    queryKey: [BOTS_ENDPOINTS.LIST],
  })) {
    if (!response) continue
    let updated = false
    const items = response.items.map((robot) => {
      if (robot.id !== event.data.robot_id) return robot
      updated = true
      return {
        ...robot,
        ip_address: event.data.ip_address,
        connection_status: event.data.connection_status,
        operational_status: event.data.operational_status,
        last_seen_at: event.data.last_seen_at,
      }
    })
    if (updated) queryClient.setQueryData(queryKey, { ...response, items })
  }
}

const robotStatusWebSocketUrl = () => {
  const apiUrl = new URL(ENV_CONFIGS.VITE_API_ENDPOINT, window.location.origin)
  apiUrl.protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  apiUrl.pathname = `${apiUrl.pathname.replace(/\/$/, '')}/realtime/robots`
  return apiUrl.toString()
}

export const useRobotStatusWebSocket = (enabled: boolean) => {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled) return
    let socket: WebSocket | undefined
    let reconnectTimer: number | undefined
    let stopped = false

    const connect = () => {
      socket = new WebSocket(robotStatusWebSocketUrl())
      socket.onmessage = (message) => {
        try {
          const event = JSON.parse(message.data) as RobotStatusChangedEvent
          applyRobotStatusEvent(queryClient, event)
        } catch {
          // Ignore malformed realtime data; a later HTTP fetch remains authoritative.
        }
      }
      socket.onclose = () => {
        if (!stopped) reconnectTimer = window.setTimeout(connect, 1000)
      }
    }

    connect()
    return () => {
      stopped = true
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer)
      socket?.close()
    }
  }, [enabled, queryClient])
}
