import { useState } from 'react'
import { MapZoneType } from '@/enum/maps'
import type { IMapDetailInfo } from '@/interface/maps'
import { MapBoundaryEditor } from '../map-preview-editor/-map-boundary-editor'
import {
  DOCKING_STATION_TOOL,
  type IMapLayoutShape,
} from '../map-preview-editor/model/-layout-types'
import { AssignDockingRobotDialog } from './-assign-docking-robot-dialog'
import { getBoundaryEditorPoints } from './-map-detail-utils'
import { MapZoneContextMenu } from './-map-zone-context-menu'

type MapDetailGridProps = {
  map: IMapDetailInfo
  canManage?: boolean
  groupId?: string
  onEdit?: (zoneId: string) => void
}

export function MapDetailGrid({
  map,
  canManage = false,
  groupId = '',
  onEdit,
}: MapDetailGridProps) {
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const boundaryPoints = getBoundaryEditorPoints(map.boundary)

  const renderEditor = (onZoneContextMenu?: (zone: IMapLayoutShape) => void) => (
    <MapBoundaryEditor
      onZoneContextMenu={onZoneContextMenu}
      canOpenZoneContextMenu={(zone) => canManage && zone.zoneType === DOCKING_STATION_TOOL}
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
    />
  )
  return (
    <section
      aria-label={map.name}
      className="order-first flex h-full min-w-0 flex-1 basis-[calc((100%-1rem)/2)] overflow-auto"
    >
      {canManage ? (
        <MapZoneContextMenu onEdit={(id) => onEdit?.(id)} onAssign={setAssigningId}>
          {renderEditor}
        </MapZoneContextMenu>
      ) : (
        renderEditor()
      )}
      {canManage && assigningId && (
        <AssignDockingRobotDialog
          key={assigningId}
          map={map}
          dockingId={assigningId}
          groupId={groupId}
          onClose={() => setAssigningId(null)}
        />
      )}
    </section>
  )
}
