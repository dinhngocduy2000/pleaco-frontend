import { Circle, Layer, Line, Rect, Stage } from 'react-konva'
import { getTranslations } from '@/lib/translation'

const PIXELS_PER_METER = 10
const CANVAS_PADDING = 20
const CORNER_RADIUS = 4
const t = getTranslations()

type MapGridPreviewProps = {
  dimensionX: number | undefined
  dimensionY: number | undefined
}

type IMapGridPreviewGeometry = {
  stageWidth: number
  stageHeight: number
  mapWidth: number
  mapHeight: number
  verticalGridLines: number[]
  horizontalGridLines: number[]
  corners: { x: number; y: number }[]
}

const getGridLinePositions = (length: number): number[] => {
  const positions = [0]

  for (let position = PIXELS_PER_METER; position < length; position += PIXELS_PER_METER) {
    positions.push(position)
  }

  if (positions.at(-1) !== length) positions.push(length)
  return positions
}

export const getMapGridPreviewGeometry = (
  dimensionX: number | undefined,
  dimensionY: number | undefined,
): IMapGridPreviewGeometry | undefined => {
  if (!dimensionX || !dimensionY || dimensionX <= 0 || dimensionY <= 0) {
    return undefined
  }

  const mapWidth = dimensionX * PIXELS_PER_METER
  const mapHeight = dimensionY * PIXELS_PER_METER

  return {
    stageWidth: mapWidth + CANVAS_PADDING * 2,
    stageHeight: mapHeight + CANVAS_PADDING * 2,
    mapWidth,
    mapHeight,
    verticalGridLines: getGridLinePositions(mapWidth),
    horizontalGridLines: getGridLinePositions(mapHeight),
    corners: [
      { x: 0, y: 0 },
      { x: mapWidth, y: 0 },
      { x: 0, y: mapHeight },
      { x: mapWidth, y: mapHeight },
    ],
  }
}

export function MapGridPreview({ dimensionX, dimensionY }: MapGridPreviewProps) {
  const geometry = getMapGridPreviewGeometry(dimensionX, dimensionY)

  return (
    <aside className="flex min-h-0 basis-full max-h-full overflow-auto flex-col bg-muted/40 p-6 md:min-h-full md:basis-1/2">
      <h3 className="text-sm font-semibold">{t.map_create_preview_title()}</h3>
      {!geometry ? (
        <div className="flex flex-1 items-center justify-center text-center text-sm text-muted-foreground">
          {t.map_create_preview_empty()}
        </div>
      ) : (
        <section
          aria-label={t.map_create_preview_canvas_label()}
          className="mt-4 flex-1 overflow-x-auto overflow-y-auto rounded-md border bg-background"
        >
          <div className="flex min-h-full min-w-full w-max items-center justify-center overflow-auto">
            <Stage height={geometry.stageHeight} width={geometry.stageWidth}>
              <Layer x={CANVAS_PADDING} y={CANVAS_PADDING}>
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
              </Layer>
            </Stage>
          </div>
        </section>
      )}
    </aside>
  )
}
