import type { IMapBoundaryCoordinate } from '@/interface/maps'

import { isPointInBoundary } from './-polygons'

import { EPSILON, getSegments, segmentsIntersect } from './-segments'

/**
 * Finds positions along a path segment where it intersects a boundary segment.
 *
 * @param pathStart - Start coordinate of the path segment.
 * @param pathEnd - End coordinate of the path segment.
 * @param boundaryStart - Start coordinate of the boundary segment.
 * @param boundaryEnd - End coordinate of the boundary segment.
 * @returns Normalized path parameters in the inclusive range from zero to one.
 *
 * @example
 * ```text
 * pathStart────────X────────pathEnd
 * t = 0           t = 0.5       t = 1
 *                  │
 *            boundary segment
 * returns [0.5]
 * ```
 */
export const getSegmentIntersectionParameters = (
  pathStart: IMapBoundaryCoordinate,
  pathEnd: IMapBoundaryCoordinate,
  boundaryStart: IMapBoundaryCoordinate,
  boundaryEnd: IMapBoundaryCoordinate,
) => {
  const pathX = pathEnd[0] - pathStart[0]
  const pathY = pathEnd[1] - pathStart[1]
  const boundaryX = boundaryEnd[0] - boundaryStart[0]
  const boundaryY = boundaryEnd[1] - boundaryStart[1]
  const denominator = pathX * boundaryY - pathY * boundaryX
  const offsetX = boundaryStart[0] - pathStart[0]
  const offsetY = boundaryStart[1] - pathStart[1]

  if (Math.abs(denominator) > EPSILON) {
    const pathParameter = (offsetX * boundaryY - offsetY * boundaryX) / denominator
    const boundaryParameter = (offsetX * pathY - offsetY * pathX) / denominator
    return pathParameter >= -EPSILON &&
      pathParameter <= 1 + EPSILON &&
      boundaryParameter >= -EPSILON &&
      boundaryParameter <= 1 + EPSILON
      ? [Math.min(1, Math.max(0, pathParameter))]
      : []
  }

  if (Math.abs(offsetX * pathY - offsetY * pathX) > EPSILON) return []
  const axis = Math.abs(pathX) >= Math.abs(pathY) ? 0 : 1
  const pathLength = pathEnd[axis] - pathStart[axis]
  if (Math.abs(pathLength) <= EPSILON) return []
  return [boundaryStart, boundaryEnd]
    .map((point) => (point[axis] - pathStart[axis]) / pathLength)
    .filter((parameter) => parameter >= -EPSILON && parameter <= 1 + EPSILON)
    .map((parameter) => Math.min(1, Math.max(0, parameter)))
}

/**
 * Checks one complete segment by sampling every interval split by boundary intersections.
 *
 * @param segmentStart - Start coordinate of the path segment.
 * @param segmentEnd - End coordinate of the path segment.
 * @param boundary - Polygon vertices defining the allowed area.
 * @returns Whether the entire segment is inside or touching the boundary.
 *
 * @example
 * ```text
 * ┌─────────────┐
 * │ S────────E  │ → true: the whole segment is inside
 * └─────────────┘
 *
 * ┌───────┐
 * │ S─────┼────E  → false: part of the segment is outside
 * └───────┘
 * ```
 */
export const isSegmentInBoundary = (
  segmentStart: IMapBoundaryCoordinate,
  segmentEnd: IMapBoundaryCoordinate,
  boundary: IMapBoundaryCoordinate[],
) => {
  if (!isPointInBoundary(segmentStart, boundary) || !isPointInBoundary(segmentEnd, boundary)) {
    return false
  }
  const parameters = [0, 1]
  for (let index = 0; index < boundary.length; index += 1) {
    parameters.push(
      ...getSegmentIntersectionParameters(
        segmentStart,
        segmentEnd,
        boundary[index],
        boundary[(index + 1) % boundary.length],
      ),
    )
  }
  const sortedParameters = parameters
    .sort((firstParameter, secondParameter) => firstParameter - secondParameter)
    .filter((parameter, index, values) => index === 0 || parameter - values[index - 1] > EPSILON)

  return sortedParameters.slice(1).every((parameter, index) => {
    const midpoint = (sortedParameters[index] + parameter) / 2
    return isPointInBoundary(
      [
        segmentStart[0] + (segmentEnd[0] - segmentStart[0]) * midpoint,
        segmentStart[1] + (segmentEnd[1] - segmentStart[1]) * midpoint,
      ],
      boundary,
    )
  })
}

/**
 * Checks every vertex and segment of an open or closed path against a polygon boundary.
 *
 * @param points - Ordered path vertices without a repeated closing coordinate.
 * @param boundary - Polygon vertices defining the allowed area.
 * @param closed - Whether to validate the last-to-first path segment.
 * @returns Whether the entire path is contained within or touches the boundary.
 *
 * @example
 * ```text
 * Boundary          Boundary
 * ┌──────────┐      ┌──────────┐
 * │ A──B     │      │ A────────┼──B
 * │    ╲     │      │          │
 * │     C    │      └──────────┘
 * └──────────┘
 * contained: true   contained: false
 * ```
 */
export const isPathContainedInBoundary = (
  points: IMapBoundaryCoordinate[],
  boundary: IMapBoundaryCoordinate[],
  closed: boolean,
) => {
  if (points.length === 0) return true
  if (!points.every((point) => isPointInBoundary(point, boundary))) return false
  const segments = getSegments(points, closed)
  return segments.every(([segmentStart, segmentEnd]) =>
    isSegmentInBoundary(segmentStart, segmentEnd, boundary),
  )
}

/**
 * Checks whether an open or closed path overlaps any completed polygon.
 * Touching an existing polygon's edge or vertex counts as overlap.
 *
 * @param points - Proposed path vertices without a repeated closing coordinate.
 * @param closed - Whether the proposed path includes its last-to-first segment.
 * @param polygons - Completed polygons to compare against.
 * @returns Whether the proposed path intersects, touches, contains, or enters any polygon.
 *
 * @example
 * ```text
 * Existing zone
 * ┌──────────┐
 * │      P───┼────Q  proposed path P→Q
 * └──────────┘
 * returns true because the path crosses the zone edge
 * ```
 */
export const doesPathOverlapPolygons = (
  points: IMapBoundaryCoordinate[],
  closed: boolean,
  polygons: IMapBoundaryCoordinate[][],
) => {
  if (points.length === 0) return false
  const pathSegments = getSegments(points, closed)

  return polygons.some((polygon) => {
    if (polygon.length < 3) return false
    if (points.some((point) => isPointInBoundary(point, polygon))) return true

    const polygonSegments = getSegments(polygon, true)
    if (
      pathSegments.some(([pathStart, pathEnd]) =>
        polygonSegments.some(([polygonStart, polygonEnd]) =>
          segmentsIntersect(pathStart, pathEnd, polygonStart, polygonEnd),
        ),
      )
    ) {
      return true
    }

    return closed && polygon.some((point) => isPointInBoundary(point, points))
  })
}
