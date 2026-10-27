import AppLogo from '@/assets/svgs/app-logo-without-text'
import { MAP_CANVAS_PADDING } from './-map-grid-preview'
import { worldPointToCanvas } from './geometry/-coordinates'
import { DOCKING_STATION_SIZE_METERS, type IMapDockingStationShape } from './model/-layout-types'

type MapDockingStationRobotProps = {
  station: IMapDockingStationShape
  dimensionY: number
  pixelsPerMeter: number
  positionOffset?: { x: number; y: number }
}

const DEFAULT_POSITION_OFFSET = { x: 4, y: -4 }

export function MapDockingStationRobot({
  station,
  dimensionY,
  pixelsPerMeter,
  positionOffset = DEFAULT_POSITION_OFFSET,
}: MapDockingStationRobotProps) {
  if (!station.robot_id) return null

  const stationPoints = station.geometry.coordinates[0] ?? []
  if (stationPoints.length === 0) return null

  const center = stationPoints.reduce(
    (position, point) => ({
      x: position.x + point[0] / stationPoints.length,
      y: position.y + point[1] / stationPoints.length,
    }),
    { x: 0, y: 0 },
  )
  const canvasCenter = worldPointToCanvas([center.x, center.y], dimensionY, pixelsPerMeter)
  const stationSize = DOCKING_STATION_SIZE_METERS * pixelsPerMeter

  return (
    <AppLogo
      aria-label="Assigned robot"
      className="pointer-events-none absolute z-50"
      height={stationSize}
      style={{
        left: MAP_CANVAS_PADDING + canvasCenter.x + positionOffset.x,
        top: MAP_CANVAS_PADDING + canvasCenter.y + positionOffset.y,
        transform: 'translate(-50%, -50%)',
      }}
      width={stationSize}
    />
  )
}
