import { useState } from 'react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { MapZoneType } from '@/enum/maps'
import type { IMapDetailInfo } from '@/interface/maps'
import { getTranslations } from '@/lib/translation'
import { MapBoundaryEditor } from '../map-preview-editor/-map-boundary-editor'
import { DOCKING_STATION_TOOL } from '../map-preview-editor/model/-layout-types'
import { getBoundaryEditorPoints } from './-map-detail-utils'

const t = getTranslations()

type MapDetailGridProps = {
  map: IMapDetailInfo
  canManageDockingStations: boolean
  onEditLayout: () => void
  onAssignRobot: (dockingStationId: string) => void
}

export function MapDetailGrid({
  map,
  canManageDockingStations,
  onEditLayout,
  onAssignRobot,
}: MapDetailGridProps) {
  const [contextMenuDockingStationId, setContextMenuDockingStationId] = useState<string | null>(
    null,
  )
  const boundaryPoints = getBoundaryEditorPoints(map.boundary)

  return (
    <ContextMenu
      open={contextMenuDockingStationId !== null}
      onOpenChange={(open) => {
        if (!open) setContextMenuDockingStationId(null)
      }}
    >
      <ContextMenuTrigger asChild>
        <section
          aria-label={map.name}
          className="order-first flex h-full min-w-0 flex-1 basis-[calc((100%-1rem)/2)] overflow-auto"
        >
          <MapBoundaryEditor
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
            interaction={{
              mode: 'view',
              onBackgroundContextMenu: () => setContextMenuDockingStationId(null),
              onZoneContextMenu: (zoneId) => {
                if (
                  !canManageDockingStations ||
                  !map.docking_stations.some(({ id }) => id === zoneId)
                ) {
                  setContextMenuDockingStationId(null)
                  return
                }
                setContextMenuDockingStationId(zoneId)
              },
            }}
          />
        </section>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onSelect={() => {
            setContextMenuDockingStationId(null)
            onEditLayout()
          }}
        >
          {t.map_detail_edit_zone()}
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={() => {
            if (!contextMenuDockingStationId) return
            onAssignRobot(contextMenuDockingStationId)
            setContextMenuDockingStationId(null)
          }}
        >
          {t.map_detail_assign_robot()}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
