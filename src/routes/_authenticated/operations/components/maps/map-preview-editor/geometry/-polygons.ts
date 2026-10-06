import type { IMapBoundaryCoordinate } from '@/interface/maps'

import {
  EPSILON,
  getSegments,
  hasAdjacentOverlap,
  hasDuplicateCoordinates,
  isPointOnSegment,
  orientation,
  segmentsIntersect,
} from './-segments'

/**
 * Detects overlapping adjacent edges and intersections between nonadjacent edges.
 * Normal shared endpoints of adjacent edges are allowed.
 *
 * @param points - Ordered world-coordinate vertices without a repeated closing point.
 * @param closed - Whether to include the last-to-first edge.
 * @returns Whether the path contains an adjacent overlap or nonadjacent intersection.
 *
 * @example
 * ```text
 * Valid polygon:      Self-intersecting polygon:
 * A────B              A╲  ╱C
 * │    │                ╳
 * D────C              D╱  ╲B
 * ```
 */
export const hasSelfIntersection = (points: IMapBoundaryCoordinate[], closed: boolean) => {
  if (hasAdjacentOverlap(points, closed)) return true
  const segments = getSegments(points, closed)

  return segments.some((firstSegment, firstSegmentIndex) =>
    segments.some((secondSegment, secondSegmentIndex) => {
      if (secondSegmentIndex <= firstSegmentIndex) return false
      if (Math.abs(firstSegmentIndex - secondSegmentIndex) === 1) return false
      if (closed && firstSegmentIndex === 0 && secondSegmentIndex === segments.length - 1) {
        return false
      }
      return segmentsIntersect(firstSegment[0], firstSegment[1], secondSegment[0], secondSegment[1])
    }),
  )
}

/**
 * Computes absolute shoelace area in square meters, implicitly closing the polygon.
 *
 * @param points - Ordered world-coordinate vertices in meters.
 * @returns Zero for fewer than three vertices; self-intersecting inputs may cancel area.
 *
 * @example
 * ```text
 * D(0,2)────C(3,2)
 *   │          │      area = 3 × 2 = 6 m²
 * A(0,0)────B(3,0)
 * ```
 */
export const getPolygonArea = (points: IMapBoundaryCoordinate[]) => {
  if (points.length < 3) return 0

  return Math.abs(
    points.reduce((area, point, index) => {
      const nextPoint = points[(index + 1) % points.length]
      return area + point[0] * nextPoint[1] - nextPoint[0] * point[1]
    }, 0) / 2,
  )
}

/**
 * Requires a closed polygon with at least three distinct vertices, area above the
 * tolerance, and no self-intersections.
 *
 * @param points - Ordered world-coordinate vertices without a repeated closing point.
 * @param closed - Whether the editor considers the boundary closed.
 * @returns Whether the vertices form a valid closed polygon.
 *
 * @example
 * ```text
 * Valid:             Invalid:
 *    B               A╲  ╱C
 *   ╱ ╲                ╳     path A→B→C→D
 *  A───C             D╱  ╲B  has crossed edges
 * ```
 */
export const isValidBoundaryPolygon = (points: IMapBoundaryCoordinate[], closed: boolean) => {
  if (!closed || points.length < 3 || getPolygonArea(points) <= EPSILON) return false
  if (hasDuplicateCoordinates(points)) return false
  return !hasSelfIntersection(points, true)
}

/**
 * Checks whether a point is inside a polygon or lies on one of its edges.
 *
 * @param point - World coordinate to test.
 * @param boundary - Closed polygon vertices without a repeated closing coordinate.
 * @returns Whether the point lies inside or on the boundary polygon.
 *
 * @example
 * ```text
 * A────────B
 * │  P     │  P is inside  → true
 * │        Q  Q is on edge → true
 * D────────C     R outside → false
 *              R
 * ```
 */
export const isPointInBoundary = (
  point: IMapBoundaryCoordinate,
  boundary: IMapBoundaryCoordinate[],
) => {
  if (boundary.length < 3) return false
  let inside = false

  for (let index = 0; index < boundary.length; index += 1) {
    const boundaryEdgeStart = boundary[index]
    const boundaryEdgeEnd = boundary[(index + 1) % boundary.length]
    if (
      Math.abs(orientation(boundaryEdgeStart, point, boundaryEdgeEnd)) <= EPSILON &&
      isPointOnSegment(boundaryEdgeStart, point, boundaryEdgeEnd)
    ) {
      return true
    }

    const crossesRay =
      boundaryEdgeStart[1] > point[1] !== boundaryEdgeEnd[1] > point[1] &&
      point[0] <
        ((boundaryEdgeEnd[0] - boundaryEdgeStart[0]) * (point[1] - boundaryEdgeStart[1])) /
          (boundaryEdgeEnd[1] - boundaryEdgeStart[1]) +
          boundaryEdgeStart[0]
    if (crossesRay) inside = !inside
  }

  return inside
}

/**
 * Validates an editor update, allowing incomplete open paths, including an empty path.
 *
 * @param points - Proposed world-coordinate vertices without a repeated closing point.
 * @param closed - Whether to require a complete, valid polygon.
 * @returns False for duplicate vertices, intersections, or an invalid closed polygon.
 *
 * @example
 * ```text
 * A→B→C           A→B→A
 * open path       duplicate A
 * accepted        rejected
 * ```
 */
export const canCommitBoundaryPoints = (points: IMapBoundaryCoordinate[], closed: boolean) => {
  if (hasDuplicateCoordinates(points)) return false
  if (hasSelfIntersection(points, closed)) return false
  return !closed || isValidBoundaryPolygon(points, true)
}
