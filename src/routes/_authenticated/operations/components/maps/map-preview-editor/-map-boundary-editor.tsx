import { CircleAlert, Minus, Plus } from 'lucide-react'
import { Circle, Layer, Line, Stage } from 'react-konva'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { MapZoneType } from '@/enum/maps'
import type { IMapBoundaryCoordinate } from '@/interface/maps'
import { getTranslations } from '@/lib/translation'
import {
  type MapBoundaryEditorProps,
  useMapBoundaryEditor,
} from '../../../../../../hooks/map-preview-editor/-use-map-boundary-editor'
import { MAP_CANVAS_PADDING, MapGridLayer } from './-map-grid-preview'
import { flattenCanvasPoints, worldPointToCanvas } from './geometry/-coordinates'
import type { MapLayoutIssue } from './model/-layout-issues'
import { MAP_ZONE_STYLES } from './model/-layout-styles'
import {
  DOCKING_STATION_TOOL,
  type IMapLayoutShape,
  type IMapZoneDrafts,
  type MapCanvasZoneType,
} from './model/-layout-types'

const VERTEX_RADIUS = 5
const t = getTranslations()

type MapLayoutEditorProps = {
  dimensions: { x: number; y: number }
  active: { points: IMapBoundaryCoordinate[]; closed: boolean; zoneType: MapCanvasZoneType }
  layout: {
    boundary: { points: IMapBoundaryCoordinate[]; closed: boolean }
    zones: IMapLayoutShape[]
    drafts?: IMapZoneDrafts
    issues?: MapLayoutIssue[]
    selectedZoneId?: string
    selectionMode?: boolean
    showBoundary?: boolean
  }
  interaction:
    | { mode: 'view' }
    | ({ mode: 'edit' } & Pick<
        MapBoundaryEditorProps,
        | 'interactive'
        | 'onChange'
        | 'onInvalid'
        | 'canChange'
        | 'onBackgroundClick'
        | 'fixedPlacementSize'
      > & { onSelectZone?: (clientId: string) => void })
}

const ignoreChange: MapBoundaryEditorProps['onChange'] = () => undefined
const ignoreInvalid: MapBoundaryEditorProps['onInvalid'] = () => undefined

export function MapBoundaryEditor({
  dimensions,
  active,
  layout,
  interaction,
}: MapLayoutEditorProps) {
  const { x: dimensionX, y: dimensionY } = dimensions
  const { points, closed, zoneType: activeZoneType } = active
  const {
    boundary: { points: boundaryPoints, closed: boundaryClosed },
    zones,
    drafts,
    issues = [],
    selectedZoneId,
    selectionMode = false,
    showBoundary = false,
  } = layout
  const editable = interaction.mode === 'edit'
  const interactive = editable && interaction.interactive
  const onSelectZone = editable ? interaction.onSelectZone : undefined
  const {
    canvasPoints,
    canZoomIn,
    canZoomOut,
    extension,
    geometry,
    handleEndpointMouseDown,
    handleStageClick,
    handleStageMouseMove,
    handleStageMouseLeave,
    handleStageMouseUp,
    handleVertexClick,
    handleVertexDragEnd,
    handleZoomIn,
    handleZoomOut,
    placementPreview,
    scale,
  } = useMapBoundaryEditor({
    dimensionX,
    dimensionY,
    points,
    closed,
    interactive,
    onChange: editable ? interaction.onChange : ignoreChange,
    onInvalid: editable ? interaction.onInvalid : ignoreInvalid,
    canChange: editable ? interaction.canChange : undefined,
    onBackgroundClick: editable ? interaction.onBackgroundClick : undefined,
    fixedPlacementSize: editable ? interaction.fixedPlacementSize : undefined,
  })

  if (!geometry) return null

  const activeStyle = MAP_ZONE_STYLES[activeZoneType]
  const pixelsPerMeter = geometry.mapWidth / dimensionX
  const getCanvasPoints = (worldPoints: IMapBoundaryCoordinate[]) =>
    flattenCanvasPoints(
      worldPoints.map((point) => worldPointToCanvas(point, dimensionY, pixelsPerMeter)),
    )

  return (
    <TooltipProvider>
      <div className="relative min-h-0 flex-1 overflow-auto">
        <section
          aria-label={t.map_boundary_canvas_label()}
          className="size-full overflow-auto rounded-md border bg-background"
        >
          <div className="flex min-h-full min-w-full w-max items-center justify-center">
            <div
              className="relative shrink-0"
              style={{ width: geometry.stageWidth, height: geometry.stageHeight }}
            >
              <Stage
                height={geometry.stageHeight}
                width={geometry.stageWidth}
                onClick={handleStageClick}
                onMouseLeave={handleStageMouseLeave}
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
                    if (
                      zone.clientId === selectedZoneId &&
                      zone.zoneType !== DOCKING_STATION_TOOL
                    ) {
                      return null
                    }
                    const style = MAP_ZONE_STYLES[zone.zoneType]
                    const zonePoints = zone.geometry.coordinates[0] ?? []
                    const selectedDockingStation =
                      zone.zoneType === DOCKING_STATION_TOOL && zone.clientId === selectedZoneId
                    return (
                      <Line
                        key={zone.clientId}
                        closed
                        dash={selectedDockingStation ? [8, 6] : style.dash}
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
                  {placementPreview && (
                    <Line
                      closed
                      dash={activeStyle.dash}
                      fill={activeStyle.fill}
                      listening={false}
                      name="map-docking-station-preview"
                      points={getCanvasPoints(placementPreview)}
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
              {issues.map((issue) => {
                const projected = issue.points.map((point) =>
                  worldPointToCanvas(point, dimensionY, pixelsPerMeter),
                )
                if (projected.length === 0) return null
                const left = Math.min(
                  geometry.stageWidth - 24,
                  Math.max(...projected.map((point) => point.x)) + MAP_CANVAS_PADDING + 4,
                )
                const top = Math.max(
                  0,
                  Math.min(...projected.map((point) => point.y)) + MAP_CANVAS_PADDING - 12,
                )
                const description = [
                  issue.overlap ? t.map_layout_warning_overlap() : undefined,
                  issue.outsideBoundary ? t.map_layout_warning_boundary() : undefined,
                ]
                  .filter(Boolean)
                  .join(' ')
                return (
                  <Tooltip key={issue.key}>
                    <TooltipTrigger asChild>
                      <button
                        aria-label={description}
                        className="absolute z-10 rounded-full bg-background text-destructive focus-visible:outline-2 focus-visible:outline-ring"
                        data-zone-warning={issue.key}
                        style={{ left, top }}
                        type="button"
                      >
                        <CircleAlert className="size-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{description}</TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
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
    </TooltipProvider>
  )
}
