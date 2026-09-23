import type { IMapDetailInfo } from '@/interface/maps'
import { MapBoundaryEditor } from '../map-preview-editor/-map-boundary-editor'
import { DOCKING_STATION_TOOL } from '../map-preview-editor/utils/-map-zone-types'
import { getBoundaryEditorPoints } from './-map-detail-utils'

type MapDetailGridProps = {
  map: IMapDetailInfo
}

export function MapDetailGrid({ map }: MapDetailGridProps) {
  const boundaryPoints = getBoundaryEditorPoints(map.boundary)

  return (
    <section
      aria-label={map.name}
      className="order-first flex h-full min-w-0 flex-1 basis-[calc((100%-1rem)/2)] overflow-auto"
    >
      <MapBoundaryEditor
        boundaryClosed={boundaryPoints.length >= 3}
        boundaryPoints={boundaryPoints}
        closed={false}
        dimensionX={map.dimension_x}
        dimensionY={map.dimension_y}
        interactive={false}
        points={[]}
        showBoundary
        zones={[
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
        ]}
        onChange={() => undefined}
        onInvalid={() => undefined}
      />
    </section>
  )
}
