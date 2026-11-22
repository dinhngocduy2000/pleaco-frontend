import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import type { MapRobotPosition } from '@/api/maps'
import {
  getMapRobotPositionsQueryKey,
  nextMapRobotPositionRevision,
} from '@/queries/use-maps-query'
import { acquireRealtimeConnection } from '@/realtime/socket'
import type { MapRobotPositionEvent } from '@/realtime/types'

export function isMapRobotPositionEvent(value: unknown): value is MapRobotPositionEvent {
  if (!value || typeof value !== 'object') return false
  const event = value as Record<string, unknown>
  if (typeof event.map_id !== 'string' || typeof event.robot_id !== 'string') return false
  if (!event.position || typeof event.position !== 'object') return false
  const position = event.position as Record<string, unknown>
  return (
    typeof position.x === 'number' &&
    Number.isFinite(position.x) &&
    typeof position.y === 'number' &&
    Number.isFinite(position.y) &&
    typeof position.updated_at === 'string' &&
    Number.isFinite(Date.parse(position.updated_at))
  )
}

export function useMapRobotPositionsSocket(
  mapId: string,
  groupId: string,
  robots: MapRobotPosition[],
  snapshotRevision = 0,
) {
  const queryClient = useQueryClient()
  const scope = `${groupId}:${mapId}`
  const [live, setLive] = useState<{
    scope: string
    positions: Map<string, { position: MapRobotPositionEvent['position']; revision: number }>
  }>({
    scope,
    positions: new Map(),
  })
  if (live.scope !== scope) setLive({ scope, positions: new Map() })

  useEffect(() => {
    if (!mapId || !groupId) return
    let disposed = false
    const refresh = async (subscribedMapId: string) => {
      if (disposed || subscribedMapId !== mapId) return
      const filters = {
        queryKey: getMapRobotPositionsQueryKey(mapId, groupId),
        exact: true,
      }
      await queryClient.cancelQueries(filters)
      if (!disposed) await queryClient.invalidateQueries(filters)
    }
    const lease = acquireRealtimeConnection(refresh)
    const { connection } = lease
    const handlePosition = (event: MapRobotPositionEvent) => {
      if (disposed || !isMapRobotPositionEvent(event) || event.map_id !== mapId) return
      const revision = nextMapRobotPositionRevision()
      setLive((current) => {
        if (current.scope !== scope) return current
        const previous = current.positions.get(event.robot_id)
        if (
          previous &&
          Date.parse(previous.position.updated_at) >= Date.parse(event.position.updated_at)
        )
          return current
        return {
          scope,
          positions: new Map(current.positions).set(event.robot_id, {
            position: event.position,
            revision,
          }),
        }
      })
    }
    connection.socket.on('map.robot.position', handlePosition)
    void connection
      .subscribeToMap(mapId)
      .then((result) => {
        if (!disposed && !result.success)
          console.error('Map room subscription failed:', result.error)
      })
      .catch((error: unknown) => {
        if (!disposed) console.error('Map room subscription failed:', error)
      })
    return () => {
      disposed = true
      connection.socket.off('map.robot.position', handlePosition)
      void connection
        .unsubscribeFromMap(mapId)
        .catch((error: unknown) => console.error('Map room unsubscribe failed:', error))
        .finally(lease.release)
    }
  }, [groupId, mapId, queryClient, scope])

  return robots.map((robot) => {
    const update = live.scope === scope ? live.positions.get(robot.id) : undefined
    // Every position published before the request was already committed in Redis.
    if (!update || update.revision <= snapshotRevision) return robot
    const { position } = update
    if (
      robot.position &&
      robot.position.source !== 'dock' &&
      Date.parse(robot.position.updated_at) >= Date.parse(position.updated_at)
    )
      return robot
    return { ...robot, position }
  })
}
