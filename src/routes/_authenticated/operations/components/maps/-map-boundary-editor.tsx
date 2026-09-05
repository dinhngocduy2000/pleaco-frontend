import { Minus, Plus } from 'lucide-react'
import { Circle, Layer, Line, Stage } from 'react-konva'
import { Button } from '@/components/ui/button'
import { getTranslations } from '@/lib/translation'
import { flattenCanvasPoints } from './-map-boundary-geometry'
import { MAP_CANVAS_PADDING, MapGridLayer } from './-map-grid-preview'
import { type MapBoundaryEditorProps, useMapBoundaryEditor } from './-use-map-boundary-editor'

const VERTEX_RADIUS = 5
const t = getTranslations()

export function MapBoundaryEditor({
  dimensionX,
  dimensionY,
  points,
  closed,
  interactive,
  onChange,
  onInvalid,
}: MapBoundaryEditorProps) {
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
  })

  if (!geometry) return null

  return (
    <div className="relative min-h-0 flex-1">
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
              {canvasPoints.length > 1 && (
                <Line
                  closed={closed}
                  fill={closed ? 'rgb(97 95 255 / 0.12)' : undefined}
                  listening={false}
                  points={flattenCanvasPoints(canvasPoints)}
                  stroke="#4f46e5"
                  strokeWidth={3}
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
                  stroke="#4f46e5"
                  strokeWidth={2}
                />
              )}
              {canvasPoints.map((point, index) => {
                const isEndpoint = !closed && index === canvasPoints.length - 1
                return (
                  <Circle
                    key={`${points[index][0]}-${points[index][1]}`}
                    draggable={interactive && !isEndpoint}
                    fill={index === 0 ? '#4f46e5' : '#ffffff'}
                    radius={VERTEX_RADIUS}
                    stroke="#4f46e5"
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
