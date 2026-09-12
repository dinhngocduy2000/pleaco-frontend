import { Minus, Plus } from 'lucide-react'
import { Circle, Layer, Line, Stage } from 'react-konva'
import { Button } from '@/components/ui/button'
import { MapZoneType } from '@/enum/maps'
import { getTranslations } from '@/lib/translation'
import { flattenCanvasPoints, worldPointToCanvas } from './-map-boundary-geometry'
import { MAP_CANVAS_PADDING, MapGridLayer } from './-map-grid-preview'
import { type IMapZoneDrafts, type IMapZoneShape, MAP_ZONE_STYLES } from './-map-zone-types'
import { type MapBoundaryEditorProps, useMapBoundaryEditor } from './-use-map-boundary-editor'

const VERTEX_RADIUS = 5
const t = getTranslations()

type MapLayoutEditorProps = MapBoundaryEditorProps & {
  activeZoneType?: MapZoneType
  boundaryClosed?: boolean
  boundaryPoints?: MapBoundaryEditorProps['points']
  drafts?: IMapZoneDrafts
  selectedZoneId?: string
  selectionMode?: boolean
  showBoundary?: boolean
  zones?: IMapZoneShape[]
  onSelectZone?: (clientId: string) => void
}

export function MapBoundaryEditor({
  dimensionX,
  dimensionY,
  points,
  closed,
  interactive,
  onChange,
  onInvalid,
  canChange,
  onBackgroundClick,
  activeZoneType = MapZoneType.BOUNDARY,
  boundaryClosed = closed,
  boundaryPoints = points,
  drafts,
  selectedZoneId,
  selectionMode = false,
  showBoundary = false,
  zones = [],
  onSelectZone,
}: MapLayoutEditorProps) {
  const {
    canvasPoints,
    canZoomIn,
    canZoomOut,
    extension,
    geometry,
    handleEndpointMouseDown,
    handleStageClick,
    handleStageMouseMove,
    handleStageMouseUp,
    handleVertexClick,
    handleVertexDragEnd,
    handleZoomIn,
    handleZoomOut,
    scale,
  } = useMapBoundaryEditor({
    dimensionX,
    dimensionY,
    points,
    closed,
    interactive,
    onChange,
    onInvalid,
    canChange,
    onBackgroundClick,
  })

  if (!geometry) return null

  const activeStyle = MAP_ZONE_STYLES[activeZoneType]
  const pixelsPerMeter = geometry.mapWidth / dimensionX
  const getCanvasPoints = (worldPoints: MapBoundaryEditorProps['points']) =>
    flattenCanvasPoints(
      worldPoints.map((point) => worldPointToCanvas(point, dimensionY, pixelsPerMeter)),
    )

  return (
    <div className="relative min-h-0 flex-1 overflow-auto">
      <section
        aria-label={t.map_boundary_canvas_label()}
        className="size-full overflow-auto rounded-md border bg-background"
      >
        <div className="flex min-h-full min-w-full w-max items-center justify-center">
          <Stage
            height={geometry.stageHeight}
            width={geometry.stageWidth}
            onClick={handleStageClick}
            onMouseMove={handleStageMouseMove}
            onMouseUp={handleStageMouseUp}
          >
            <Layer x={MAP_CANVAS_PADDING} y={MAP_CANVAS_PADDING} listening={false}>
              <MapGridLayer geometry={geometry} />
            </Layer>
            <Layer x={MAP_CANVAS_PADDING} y={MAP_CANVAS_PADDING}>
              {(activeZoneType !== MapZoneType.BOUNDARY || selectionMode || showBoundary) &&
                boundaryPoints.length > 1 && (
                  <Line
                    closed={boundaryClosed}
                    dash={MAP_ZONE_STYLES.BOUNDARY.dash}
                    fill={MAP_ZONE_STYLES.BOUNDARY.fill}
                    listening={false}
                    points={getCanvasPoints(boundaryPoints)}
                    stroke={MAP_ZONE_STYLES.BOUNDARY.stroke}
                    strokeWidth={MAP_ZONE_STYLES.BOUNDARY.strokeWidth}
                  />
                )}
              {zones.map((zone) => {
                if (zone.clientId === selectedZoneId) return null
                const style = MAP_ZONE_STYLES[zone.zoneType]
                const zonePoints = zone.geometry.coordinates[0] ?? []
                return (
                  <Line
                    key={zone.clientId}
                    closed
                    dash={style.dash}
                    fill={style.fill}
                    listening={selectionMode}
                    name={`map-zone-${zone.zoneType}`}
                    points={getCanvasPoints(zonePoints)}
                    stroke={style.stroke}
                    strokeWidth={style.strokeWidth}
                    onClick={(event) => {
                      event.cancelBubble = true
                      onSelectZone?.(zone.clientId)
                    }}
                  />
                )
              })}
              {drafts &&
                Object.entries(drafts).map(([zoneType, draft]) => {
                  if (zoneType === activeZoneType || draft.points.length < 2) return null
                  const style = MAP_ZONE_STYLES[zoneType as MapZoneType]
                  return (
                    <Line
                      key={`draft-${zoneType}`}
                      dash={style.dash}
                      fill={style.fill}
                      listening={false}
                      points={getCanvasPoints(draft.points)}
                      stroke={style.stroke}
                      strokeWidth={style.strokeWidth}
                    />
                  )
                })}
              {canvasPoints.length > 1 && (
                <Line
                  closed={closed}
                  dash={activeStyle.dash}
                  fill={closed ? activeStyle.fill : undefined}
                  listening={false}
                  points={flattenCanvasPoints(canvasPoints)}
                  stroke={activeStyle.stroke}
                  strokeWidth={activeStyle.strokeWidth}
                />
              )}
              {extension && (
                <Line
                  dash={[6, 4]}
                  listening={false}
                  points={[
                    canvasPoints.at(-1)?.x ?? extension.start.x,
                    canvasPoints.at(-1)?.y ?? extension.start.y,
                    extension.preview.x,
                    extension.preview.y,
                  ]}
                  stroke={activeStyle.stroke}
                  strokeWidth={2}
                />
              )}
              {canvasPoints.map((point, index) => {
                const isEndpoint = !closed && index === canvasPoints.length - 1
                return (
                  <Circle
                    key={`${points[index][0]}-${points[index][1]}`}
                    draggable={interactive && !isEndpoint}
                    fill={index === 0 ? activeStyle.stroke : '#ffffff'}
                    radius={VERTEX_RADIUS}
                    stroke={activeStyle.stroke}
                    strokeWidth={2}
                    x={point.x}
                    y={point.y}
                    onClick={(event) => handleVertexClick(index, event)}
                    onDragEnd={(event) => handleVertexDragEnd(index, event)}
                    onMouseDown={isEndpoint ? handleEndpointMouseDown : undefined}
                  />
                )
              })}
            </Layer>
          </Stage>
        </div>
      </section>
      <div className="absolute right-3 bottom-3 z-10 flex flex-col rounded-md border bg-background p-1 shadow-sm">
        <Button
          aria-label={t.map_create_preview_zoom_in()}
          disabled={!canZoomIn}
          size="icon-sm"
          type="button"
          variant="ghost"
          onClick={handleZoomIn}
        >
          <Plus />
        </Button>
        <span aria-live="polite" className="py-1 text-center text-xs font-medium">
          {t.map_create_preview_scale({ scale: scale.toFixed(1) })}
        </span>
        <Button
          aria-label={t.map_create_preview_zoom_out()}
          disabled={!canZoomOut}
          size="icon-sm"
          type="button"
          variant="ghost"
          onClick={handleZoomOut}
        >
          <Minus />
        </Button>
      </div>
    </div>
  )
}
