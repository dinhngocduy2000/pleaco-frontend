import type { IMapBoundaryCoordinate } from '@/interface/maps'

import {
  canvasPointToWorld,
  clampBoundaryCoordinate,
  isCanvasPointWithinTolerance,
  type MapCanvasPoint,
} from '../geometry/-coordinates'

import { canCommitBoundaryPoints } from '../geometry/-polygons'

type BoundaryPointUpdate = { points: IMapBoundaryCoordinate[]; closed: boolean }

/**
 * Proposes closing an open boundary near its first vertex, or appending a clamped vertex.
 * Closure requires at least three existing vertices and does not repeat the first point.
 * An invalid closure is rejected without falling back to appending a point.
 *
 * @param options - Pointer, current vertices, map dimensions, and display scale.
 * @param options.canvasPoint - Candidate map-local pixel position.
 * @param options.canvasPoints - Canvas projections corresponding to `points` at the same zoom.
 * @param options.points - Current world vertices without a repeated closing point.
 * @param options.dimensionX - Map width in meters.
 * @param options.dimensionY - Map height in meters.
 * @param options.pixelsPerMeter - Positive pixel density, including zoom.
 * @param options.closureTolerance - Radius in pixels around the first vertex for closure.
 * @returns Accepted update, or undefined when geometry validation rejects it.
 *
 * @example
 * ```text
 * Append a point:          Close near the first point:
 * A──B                    A●────B
 *     ╲      click C       ╲    │
 *      C                   C────┘ click near A
 * → {points: [A,B,C],      → {points: [A,B,C],
 *    closed: false}           closed: true}
 * ```
 */
export const getBoundaryPointUpdate = ({
  canvasPoint,
  canvasPoints,
  points,
  dimensionX,
  dimensionY,
  pixelsPerMeter,
  closureTolerance,
}: {
  canvasPoint: MapCanvasPoint
  canvasPoints: MapCanvasPoint[]
  points: IMapBoundaryCoordinate[]
  dimensionX: number
  dimensionY: number
  pixelsPerMeter: number
  closureTolerance: number
}): BoundaryPointUpdate | undefined => {
  const firstPoint = canvasPoints[0]
  const closesBoundary =
    points.length >= 3 &&
    firstPoint !== undefined &&
    isCanvasPointWithinTolerance(firstPoint, canvasPoint, closureTolerance)

  if (closesBoundary) {
    return canCommitBoundaryPoints(points, true) ? { points, closed: true } : undefined
  }

  const nextPoint = clampBoundaryCoordinate(
    canvasPointToWorld(canvasPoint, dimensionY, pixelsPerMeter),
    dimensionX,
    dimensionY,
  )
  const nextPoints = [...points, nextPoint]
  return canCommitBoundaryPoints(nextPoints, false)
    ? { points: nextPoints, closed: false }
    : undefined
}

/**
 * Proposes moving one vertex, clamping its world position without mutating the input.
 *
 * @param options - Vertex selection, target position, and current map/editor state.
 * @param options.points - Current world vertices without a repeated closing point.
 * @param options.index - Existing vertex index; the caller must supply a valid index.
 * @param options.canvasPoint - Target map-local pixel position.
 * @param options.dimensionX - Map width in meters.
 * @param options.dimensionY - Map height in meters.
 * @param options.pixelsPerMeter - Positive pixel density, including zoom.
 * @param options.closed - Whether the moved boundary must remain a valid closed polygon.
 * @returns Updated vertices, or undefined when geometry validation rejects the move.
 *
 * @example
 * ```text
 * Before drag:       After dragging B:
 *    B                    B′
 *   ╱ ╲                  ╱ ╲
 *  A───C                A───C
 * returns [A, B′, C] when the polygon remains valid
 * ```
 */
export const getMovedBoundaryPoints = ({
  points,
  index,
  canvasPoint,
  dimensionX,
  dimensionY,
  pixelsPerMeter,
  closed,
}: {
  points: IMapBoundaryCoordinate[]
  index: number
  canvasPoint: MapCanvasPoint
  dimensionX: number
  dimensionY: number
  pixelsPerMeter: number
  closed: boolean
}): IMapBoundaryCoordinate[] | undefined => {
  const nextPoints = [...points]
  nextPoints[index] = clampBoundaryCoordinate(
    canvasPointToWorld(canvasPoint, dimensionY, pixelsPerMeter),
    dimensionX,
    dimensionY,
  )
  return canCommitBoundaryPoints(nextPoints, closed) ? nextPoints : undefined
}
