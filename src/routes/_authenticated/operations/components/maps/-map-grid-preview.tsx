import { Minus, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Circle, Layer, Line, Rect, Stage } from 'react-konva'
import { Button } from '@/components/ui/button'
import { GeometryType } from '@/enum/maps'
import type { Geometry } from '@/interface/maps'
import { getTranslations } from '@/lib/translation'
import { flattenCanvasPoints, worldPointToCanvas } from './-map-boundary-geometry'

export const MAP_PIXELS_PER_METER = 10
export const MAP_CANVAS_PADDING = 20
const CORNER_RADIUS = 4
const DEFAULT_SCALE = 1
const MIN_SCALE = 0.5
const MAX_SCALE = 3
const SCALE_STEP = 0.5
const CARD_PREVIEW_HEIGHT = 250
const CARD_PREVIEW_FALLBACK_WIDTH = 360
const t = getTranslations()

type MapGridPreviewProps = {
  dimensionX: number | undefined
  dimensionY: number | undefined
  geometry?: Geometry
  variant?: 'editor' | 'card'
}

export type IMapGridPreviewGeometry = {
  stageWidth: number
  stageHeight: number
  mapWidth: number
  mapHeight: number
  verticalGridLines: number[]
  horizontalGridLines: number[]
  corners: { x: number; y: number }[]
}

const getGridLinePositions = (length: number, gridSize: number): number[] => {
  const positions = [0]

  for (let position = gridSize; position < length; position += gridSize) {
    positions.push(position)
  }

  if (positions.at(-1) !== length) positions.push(length)
  return positions
}

export const getMapGridPreviewGeometry = (
  dimensionX: number | undefined,
  dimensionY: number | undefined,
  scale = DEFAULT_SCALE,
): IMapGridPreviewGeometry | undefined => {
  if (!dimensionX || !dimensionY || !scale || dimensionX <= 0 || dimensionY <= 0 || scale <= 0) {
    return undefined
  }

  const gridSize = MAP_PIXELS_PER_METER * scale
  const mapWidth = dimensionX * gridSize
  const mapHeight = dimensionY * gridSize

  return {
    stageWidth: mapWidth + MAP_CANVAS_PADDING * 2,
    stageHeight: mapHeight + MAP_CANVAS_PADDING * 2,
    mapWidth,
    mapHeight,
    verticalGridLines: getGridLinePositions(mapWidth, gridSize),
    horizontalGridLines: getGridLinePositions(mapHeight, gridSize),
    corners: [
      { x: 0, y: 0 },
      { x: mapWidth, y: 0 },
      { x: 0, y: mapHeight },
      { x: mapWidth, y: mapHeight },
    ],
  }
}

type MapGridLayerProps = {
  geometry: IMapGridPreviewGeometry
}

export function MapGridLayer({ geometry }: MapGridLayerProps) {
  return (
    <>
      <Rect
        fill="#ffffff"
        height={geometry.mapHeight}
        stroke="#615fff"
        strokeWidth={2}
        width={geometry.mapWidth}
      />
      {geometry.verticalGridLines.map((x) => (
        <Line
          key={`vertical-${x}`}
          points={[x, 0, x, geometry.mapHeight]}
          stroke="#d4d4d8"
          strokeWidth={1}
        />
      ))}
      {geometry.horizontalGridLines.map((y) => (
        <Line
          key={`horizontal-${y}`}
          points={[0, y, geometry.mapWidth, y]}
          stroke="#d4d4d8"
          strokeWidth={1}
        />
      ))}
      {geometry.corners.map((corner) => (
        <Circle
          key={`${corner.x}-${corner.y}`}
          fill="#615fff"
          radius={CORNER_RADIUS}
          x={corner.x}
          y={corner.y}
        />
      ))}
    </>
  )
}

type MapBoundaryGeometryLayerProps = {
  boundaryGeometry: Geometry | undefined
  dimensionY: number
  pixelsPerMeter: number
}

function MapBoundaryGeometryLayer({
  boundaryGeometry,
  dimensionY,
  pixelsPerMeter,
}: MapBoundaryGeometryLayerProps) {
  if (boundaryGeometry?.type !== GeometryType.POLYGON) return null

  return boundaryGeometry.coordinates.map((polygon) => (
    <Line
      key={JSON.stringify(polygon)}
      closed
      fill="rgb(97 95 255 / 0.12)"
      name="map-boundary"
      points={flattenCanvasPoints(
        polygon.map((point) => worldPointToCanvas(point, dimensionY, pixelsPerMeter)),
      )}
      stroke="#4f46e5"
      strokeWidth={3}
    />
  ))
}

function MapCardGridPreview({
  dimensionX,
  dimensionY,
  geometry: boundaryGeometry,
}: Omit<MapGridPreviewProps, 'variant'>) {
  const previewRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(CARD_PREVIEW_FALLBACK_WIDTH)
  const baseGeometry = getMapGridPreviewGeometry(dimensionX, dimensionY)

  useEffect(() => {
    const preview = previewRef.current
    if (!preview) return

    const updateWidth = () => setWidth(preview.clientWidth || CARD_PREVIEW_FALLBACK_WIDTH)
    updateWidth()

    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(updateWidth)
    observer.observe(preview)
    return () => observer.disconnect()
  }, [])

  const scale = baseGeometry
    ? Math.min(
        (width - MAP_CANVAS_PADDING * 2) / baseGeometry.mapWidth,
        (CARD_PREVIEW_HEIGHT - MAP_CANVAS_PADDING * 2) / baseGeometry.mapHeight,
      )
    : DEFAULT_SCALE
  const geometry = baseGeometry
    ? getMapGridPreviewGeometry(dimensionX, dimensionY, scale)
    : undefined

  return (
    <section
      ref={previewRef}
      aria-label={t.map_create_preview_canvas_label()}
      className="h-62.5 w-full overflow-hidden bg-muted/40"
      data-testid="map-card-grid-preview"
    >
      {!geometry ? (
        <div className="flex size-full items-center justify-center text-center text-sm text-muted-foreground">
          {t.map_create_preview_empty()}
        </div>
      ) : (
        <Stage height={CARD_PREVIEW_HEIGHT} width={width}>
          <Layer
            x={(width - geometry.mapWidth) / 2}
            y={(CARD_PREVIEW_HEIGHT - geometry.mapHeight) / 2}
          >
            <MapGridLayer geometry={geometry} />
            <MapBoundaryGeometryLayer
              boundaryGeometry={boundaryGeometry}
              dimensionY={dimensionY ?? 0}
              pixelsPerMeter={MAP_PIXELS_PER_METER * scale}
            />
          </Layer>
        </Stage>
      )}
    </section>
  )
}

function MapEditorGridPreview({ dimensionX, dimensionY }: Omit<MapGridPreviewProps, 'variant'>) {
  const [scale, setScale] = useState(DEFAULT_SCALE)
  const geometry = getMapGridPreviewGeometry(dimensionX, dimensionY, scale)
  const canZoomIn = scale < MAX_SCALE
  const canZoomOut = scale > MIN_SCALE

  const handleZoomIn = () => {
    setScale((currentScale) => Math.min(MAX_SCALE, currentScale + SCALE_STEP))
  }

  const handleZoomOut = () => {
    setScale((currentScale) => Math.max(MIN_SCALE, currentScale - SCALE_STEP))
  }

  return (
    <aside className="flex min-h-0 basis-full max-h-full overflow-auto flex-col bg-muted/40 p-6 md:min-h-full md:basis-1/2">
      <h3 className="text-sm font-semibold">{t.map_create_preview_title()}</h3>
      {!geometry ? (
        <div className="flex flex-1 items-center justify-center text-center text-sm text-muted-foreground">
          {t.map_create_preview_empty()}
        </div>
      ) : (
        <div className="relative mt-4 min-h-0 flex-1">
          <section
            aria-label={t.map_create_preview_canvas_label()}
            className="size-full overflow-auto rounded-md border bg-background"
          >
            <div className="flex min-h-full min-w-full w-max items-center justify-center">
              <Stage height={geometry.stageHeight} width={geometry.stageWidth}>
                <Layer x={MAP_CANVAS_PADDING} y={MAP_CANVAS_PADDING}>
                  <MapGridLayer geometry={geometry} />
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
      )}
    </aside>
  )
}

export function MapGridPreview({
  dimensionX,
  dimensionY,
  geometry,
  variant = 'editor',
}: MapGridPreviewProps) {
  if (variant === 'card') {
    return (
      <MapCardGridPreview dimensionX={dimensionX} dimensionY={dimensionY} geometry={geometry} />
    )
  }

  return <MapEditorGridPreview dimensionX={dimensionX} dimensionY={dimensionY} />
}
