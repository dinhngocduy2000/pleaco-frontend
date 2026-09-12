import type { IMapDetailInfo } from '@/interface/maps'
import { MapBoundaryEditor } from '../-map-boundary-editor'
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
        zones={map.zones.map((zone) => ({
          clientId: zone.id,
          zoneType: zone.type,
          geometry: zone.geometry,
        }))}
        onChange={() => undefined}
        onInvalid={() => undefined}
      />
    </section>
  )
}
