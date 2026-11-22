import { useState } from 'react'
import { MapZoneType } from '@/enum/maps'
import { useMapRobotPositionsSocket } from '@/hooks/use-map-robot-positions-socket'
import type { IMapDetailInfo } from '@/interface/maps'
import { getTranslations } from '@/lib/translation'
import { useMapRobotPositionsQuery } from '@/queries/use-maps-query'
import { MapBoundaryEditor } from '../map-preview-editor/-map-boundary-editor'
import {
  DOCKING_STATION_TOOL,
  type IMapLayoutShape,
} from '../map-preview-editor/model/-layout-types'
import { MapAssignRobotDialog } from './-map-assign-robot-dialog'
import { getBoundaryEditorPoints } from './-map-detail-utils'
import { MapZoneContextMenu } from './-map-zone-context-menu'

const t = getTranslations()

type MapDetailGridProps = {
  map: IMapDetailInfo
  groupId: string
  canManageDockingStations?: boolean
  onEditLayout?: () => void
}

export function MapDetailGrid({
  map,
  groupId,
  canManageDockingStations = false,
  onEditLayout = () => undefined,
}: MapDetailGridProps) {
  const [assignDockingStationId, setAssignDockingStationId] = useState<string>()
  const positions = useMapRobotPositionsQuery(map.id, groupId)
  const status = (positions.error as { response?: { status?: number } } | null)?.response?.status
  const accessError = status === 401 || status === 403 || status === 404
  const robotsPosition = useMapRobotPositionsSocket(
    map.id,
    groupId,
    accessError ? [] : (positions.data?.data?.robots ?? []),
    positions.data?.requestRevision,
  )
  const boundaryPoints = getBoundaryEditorPoints(map.boundary)
  const actionsByZoneType = canManageDockingStations
    ? {
        [DOCKING_STATION_TOOL]: (shape: IMapLayoutShape) => {
          if (shape.zoneType !== DOCKING_STATION_TOOL) return []
          return [
            { id: 'edit', label: t.map_detail_station_edit(), onSelect: onEditLayout },
            {
              id: 'assign-robot',
              label: t.map_detail_station_assign_robot(),
              onSelect: () => setAssignDockingStationId(shape.id ?? shape.clientId),
            },
          ]
        },
      }
    : {}

  return (
    <section
      aria-label={map.name}
      className="order-first flex h-full min-w-0 flex-1 basis-[calc((100%-1rem)/2)] overflow-auto"
    >
      {positions.isError && !accessError && (
        <span role="status" className="absolute z-10 rounded bg-background p-2 text-sm">
          {t.map_detail_robot_positions_refresh_error()}
        </span>
      )}
      <MapZoneContextMenu actionsByZoneType={actionsByZoneType}>
        {({ onZoneContextMenu }) => (
          <MapBoundaryEditor
            robotPositions={robotsPosition}
            dimensions={{ x: map.dimension_x, y: map.dimension_y }}
            active={{ points: [], closed: false, zoneType: MapZoneType.BOUNDARY }}
            layout={{
              boundary: { points: boundaryPoints, closed: boundaryPoints.length >= 3 },
              showBoundary: true,
              zones: [
                ...map.zones.map((zone) => ({
                  clientId: zone.id,
                  to_delete: false as const,
                  zoneType: zone.type,
                  geometry: zone.geometry,
                })),
                ...map.docking_stations.map((station) => ({
                  clientId: station.id,
                  id: station.id,
                  to_delete: false as const,
                  zoneType: DOCKING_STATION_TOOL,
                  geometry: station.geometry,
                  heading: station.heading,
                  robot_id: station.robot_id,
                })),
              ],
            }}
            interaction={{ mode: 'view' }}
            zoneContextMenu={
              canManageDockingStations
                ? { zoneTypes: [DOCKING_STATION_TOOL], onOpen: onZoneContextMenu }
                : undefined
            }
          />
        )}
      </MapZoneContextMenu>
      {assignDockingStationId && (
        <MapAssignRobotDialog
          key={`${groupId}:${map.id}:${assignDockingStationId}`}
          open
          setOpen={(open) => {
            if (!open) setAssignDockingStationId(undefined)
          }}
          map={map}
          groupId={groupId}
          dockingId={assignDockingStationId}
        />
      )}
    </section>
  )
}
