import type { IMapBoundaryCoordinate } from '@/interface/maps'

/** Map-local pixel coordinates with a top-left origin, excluding canvas padding. */
export type MapCanvasPoint = { x: number; y: number }

/**
 * Clamps a world coordinate to the inclusive rectangular map bounds.
 *
 * @param coordinate - Position in meters.
 * @param dimensionX - Nonnegative map width in meters.
 * @param dimensionY - Nonnegative map height in meters.
 * @returns A coordinate constrained to the inclusive map rectangle.
 *
 * @example
 * ```text
 * Map bounds: x = 0..10, y = 0..6
 * input [-2, 8] ──clamp──▶ output [0, 6]
 * ```
 */
export const clampBoundaryCoordinate = (
  coordinate: IMapBoundaryCoordinate,
  dimensionX: number,
  dimensionY: number,
): IMapBoundaryCoordinate => [
  Math.min(dimensionX, Math.max(0, coordinate[0])),
  Math.min(dimensionY, Math.max(0, coordinate[1])),
]

/**
 * Converts top-left canvas pixels to bottom-left world meters by flipping the y-axis.
 *
 * @param point - Map-local pixels, excluding canvas padding.
 * @param dimensionY - Map height in meters.
 * @param pixelsPerMeter - Positive pixel density, including the current zoom.
 * @returns The corresponding bottom-left-origin world coordinate in meters.
 *
 * @example
 * ```text
 * Canvas origin            World origin
 * (0,0) ──▶ x              y ▲
 *   │                         │
 *   ▼ y                  (0,0)└──▶ x
 * canvas [20, 30] ──convert──▶ world [2, 7]
 * dimensionY = 10, pixelsPerMeter = 10
 * ```
 */
export const canvasPointToWorld = (
  point: MapCanvasPoint,
  dimensionY: number,
  pixelsPerMeter: number,
): IMapBoundaryCoordinate => [point.x / pixelsPerMeter, dimensionY - point.y / pixelsPerMeter]

/**
 * Converts bottom-left world meters to top-left canvas pixels by flipping the y-axis.
 *
 * @param coordinate - World position in meters.
 * @param dimensionY - Map height in meters.
 * @param pixelsPerMeter - Positive pixel density, including the current zoom.
 * @returns Map-local pixels, excluding canvas padding.
 *
 * @example
 * ```text
 * World origin             Canvas origin
 * y ▲                      (0,0) ──▶ x
 *   │                        │
 *   └──▶ x                   ▼ y
 * world [2, 7] ──convert──▶ canvas [20, 30]
 * dimensionY = 10, pixelsPerMeter = 10
 * ```
 */
export const worldPointToCanvas = (
  coordinate: IMapBoundaryCoordinate,
  dimensionY: number,
  pixelsPerMeter: number,
): MapCanvasPoint => ({
  x: coordinate[0] * pixelsPerMeter,
  y: (dimensionY - coordinate[1]) * pixelsPerMeter,
})

/**
 * Flattens canvas vertices into the alternating x/y array expected by Konva lines.
 *
 * @param points - Ordered map-local pixel positions.
 * @returns Alternating x and y components in drawing order.
 *
 * @example
 * ```text
 * [{x: 1, y: 2}, {x: 3, y: 4}]
 *                │
 *                ▼
 *          [1, 2, 3, 4]
 * ```
 */
export const flattenCanvasPoints = (points: MapCanvasPoint[]) =>
  points.flatMap((point) => [point.x, point.y])

/**
 * Removes padding from both axes, then clamps to the inclusive map pixel bounds.
 *
 * @param point - Pixel position in the padded stage or map-local coordinate space.
 * @param mapWidth - Map width in pixels, excluding padding.
 * @param mapHeight - Map height in pixels, excluding padding.
 * @param padding - Origin offset in pixels; leave at zero for map-local positions.
 * @returns A map-local coordinate constrained to the inclusive pixel bounds.
 *
 * @example
 * ```text
 * padded point [15, 140], padding = 20
 * map size = 100 × 100
 *             │ remove padding and clamp
 *             ▼
 * local point [0, 100]
 * ```
 */
export const clampCanvasPoint = (
  point: MapCanvasPoint,
  mapWidth: number,
  mapHeight: number,
  padding = 0,
): MapCanvasPoint => ({
  x: Math.min(mapWidth, Math.max(0, point.x - padding)),
  y: Math.min(mapHeight, Math.max(0, point.y - padding)),
})

/**
 * Checks whether pixel travel meets the inclusive drag threshold.
 *
 * @param movementStart - Initial canvas position.
 * @param movementEnd - Current canvas position in the same coordinate space.
 * @param threshold - Minimum Euclidean distance in pixels.
 * @returns Whether the distance between positions meets or exceeds the threshold.
 *
 * @example
 * ```text
 * start (0,0) ───── 5 px ─────▶ end (3,4)
 * threshold = 5 px → true
 * ```
 */
export const hasMinimumCanvasMovement = (
  movementStart: MapCanvasPoint,
  movementEnd: MapCanvasPoint,
  threshold: number,
) => Math.hypot(movementEnd.x - movementStart.x, movementEnd.y - movementStart.y) >= threshold

/**
 * Checks whether two canvas positions are within an inclusive pixel radius.
 *
 * @param referencePoint - Reference canvas position.
 * @param candidatePoint - Candidate position in the same coordinate space.
 * @param tolerance - Maximum Euclidean distance in pixels.
 * @returns Whether the positions are within the inclusive tolerance radius.
 *
 * @example
 * ```text
 *       candidate •
 *                 │ 5 px
 *       reference •
 * tolerance = 5 px → true
 * ```
 */
export const isCanvasPointWithinTolerance = (
  referencePoint: MapCanvasPoint,
  candidatePoint: MapCanvasPoint,
  tolerance: number,
) =>
  Math.hypot(candidatePoint.x - referencePoint.x, candidatePoint.y - referencePoint.y) <= tolerance
