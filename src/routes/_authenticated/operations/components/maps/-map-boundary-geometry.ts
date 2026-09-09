import { GeometryType, MapBoundarySource } from '@/enum/maps'
import type {
  IMapBoundaries,
  IMapBoundaryCoordinate,
  IMapBoundaryPolygon,
  IMapListInfo,
} from '@/interface/maps'

/** Tolerance for coordinate equality, collinearity, and degenerate polygon area checks. */
const EPSILON = 1e-8

/** Map-local pixel coordinates with a top-left origin, excluding canvas padding. */
export type MapCanvasPoint = { x: number; y: number }

/** Accepted editor vertices and closure state; vertices omit the repeated closing point. */
type BoundaryPointUpdate = {
  points: IMapBoundaryCoordinate[]
  closed: boolean
}

/** Initial editor vertices, closure state, boundary method, and save restriction. */
export type InitialBoundaryState = {
  points: IMapBoundaryCoordinate[]
  closed: boolean
  unsupported: boolean
  method: MapBoundarySource
}

/**
 * Compares both world-coordinate components using the floating-point tolerance.
 *
 * @param firstCoordinate - First world coordinate to compare.
 * @param secondCoordinate - Second world coordinate to compare.
 * @returns Whether both coordinate components are equal within `EPSILON`.
 *
 * @example
 * ```text
 * [1, 2] •≈• [1.000000001, 2] → true
 * [1, 2]  ≠  [1.1, 2]         → false
 * ```
 */
const coordinatesEqual = (
  firstCoordinate: IMapBoundaryCoordinate,
  secondCoordinate: IMapBoundaryCoordinate,
) =>
  Math.abs(firstCoordinate[0] - secondCoordinate[0]) < EPSILON &&
  Math.abs(firstCoordinate[1] - secondCoordinate[1]) < EPSILON

/**
 * Detects repeated vertices anywhere in the boundary, including nonadjacent vertices.
 *
 * @param points - Ordered world-coordinate vertices to inspect.
 * @returns Whether any two vertices are equal within the coordinate tolerance.
 *
 * @example
 * ```text
 * A → B → C → A
 * ↑             ↑
 * same coordinate → duplicate found
 * ```
 */
const hasDuplicateCoordinates = (points: IMapBoundaryCoordinate[]) =>
  points.some((point, index) =>
    points.slice(index + 1).some((other) => coordinatesEqual(point, other)),
  )

/**
 * Calculates the signed turn formed by three ordered coordinates.
 *
 * @param pathStart - Coordinate where the path enters the turn.
 * @param turnVertex - Shared vertex where the direction may change.
 * @param pathEnd - Coordinate where the path exits the turn.
 * @returns Positive for clockwise, negative for counterclockwise, or zero for collinear points.
 *
 * @example
 * ```text
 * Clockwise:         Counterclockwise:   Collinear:
 * A → B              A → B               A → B → C
 *     ↓ C                ↑ C
 * result > 0         result < 0           result ≈ 0
 * ```
 */
const orientation = (
  pathStart: IMapBoundaryCoordinate,
  turnVertex: IMapBoundaryCoordinate,
  pathEnd: IMapBoundaryCoordinate,
) =>
  (turnVertex[1] - pathStart[1]) * (pathEnd[0] - turnVertex[0]) -
  (turnVertex[0] - pathStart[0]) * (pathEnd[1] - turnVertex[1])

/**
 * Checks inclusive segment bounds with tolerance. The caller must establish collinearity.
 *
 * @param segmentStart - Start endpoint of the segment.
 * @param point - Collinear coordinate to test.
 * @param segmentEnd - End endpoint of the segment.
 * @returns Whether the coordinate lies within the segment's inclusive bounds.
 *
 * @example
 * ```text
 * A────P────B  → P is on segment AB
 * A────────B  P → P is on line AB, but outside segment AB
 * ```
 */
const isPointOnSegment = (
  segmentStart: IMapBoundaryCoordinate,
  point: IMapBoundaryCoordinate,
  segmentEnd: IMapBoundaryCoordinate,
) =>
  point[0] <= Math.max(segmentStart[0], segmentEnd[0]) + EPSILON &&
  point[0] >= Math.min(segmentStart[0], segmentEnd[0]) - EPSILON &&
  point[1] <= Math.max(segmentStart[1], segmentEnd[1]) + EPSILON &&
  point[1] >= Math.min(segmentStart[1], segmentEnd[1]) - EPSILON

/**
 * Detects crossings, endpoint touches, and collinear overlaps between two segments.
 *
 * @param firstSegmentStart - Start coordinate of the first segment.
 * @param firstSegmentEnd - End coordinate of the first segment.
 * @param secondSegmentStart - Start coordinate of the second segment.
 * @param secondSegmentEnd - End coordinate of the second segment.
 * @returns Whether the two closed segments intersect or overlap.
 *
 * @example
 * ```text
 * Crossing:       Touching:          Overlapping:
 * A╲  ╱C          A────(B=C)────D    A──C──B──D
 *   ╳
 * D╱  ╲B
 * ```
 */
const segmentsIntersect = (
  firstSegmentStart: IMapBoundaryCoordinate,
  firstSegmentEnd: IMapBoundaryCoordinate,
  secondSegmentStart: IMapBoundaryCoordinate,
  secondSegmentEnd: IMapBoundaryCoordinate,
) => {
  // Identifies which side of the first segment's line contains the second segment's start.
  const secondSegmentStartRelativeToFirstSegmentLine = orientation(
    firstSegmentStart,
    firstSegmentEnd,
    secondSegmentStart,
  )
  // Identifies which side of the first segment's line contains the second segment's end.
  const secondSegmentEndRelativeToFirstSegmentLine = orientation(
    firstSegmentStart,
    firstSegmentEnd,
    secondSegmentEnd,
  )
  // Identifies which side of the second segment's line contains the first segment's start.
  const firstSegmentStartRelativeToSecondSegmentLine = orientation(
    secondSegmentStart,
    secondSegmentEnd,
    firstSegmentStart,
  )
  // Identifies which side of the second segment's line contains the first segment's end.
  const firstSegmentEndRelativeToSecondSegmentLine = orientation(
    secondSegmentStart,
    secondSegmentEnd,
    firstSegmentEnd,
  )
  // For first segment A→B and second segment C→D:
  // C and D are on opposite sides of line AB when one result is positive and the other is negative:
  // orientation(A, B, C) and orientation(A, B, D).
  const secondSegmentCrossesFirstSegmentLine =
    (secondSegmentStartRelativeToFirstSegmentLine > EPSILON &&
      secondSegmentEndRelativeToFirstSegmentLine < -EPSILON) ||
    (secondSegmentStartRelativeToFirstSegmentLine < -EPSILON &&
      secondSegmentEndRelativeToFirstSegmentLine > EPSILON)
  // A and B are on opposite sides of line CD when one result is positive and the other is negative:
  // orientation(C, D, A) and orientation(C, D, B).
  const firstSegmentCrossesSecondSegmentLine =
    (firstSegmentStartRelativeToSecondSegmentLine > EPSILON &&
      firstSegmentEndRelativeToSecondSegmentLine < -EPSILON) ||
    (firstSegmentStartRelativeToSecondSegmentLine < -EPSILON &&
      firstSegmentEndRelativeToSecondSegmentLine > EPSILON)

  if (secondSegmentCrossesFirstSegmentLine && firstSegmentCrossesSecondSegmentLine) {
    return true
  }

  // C lies on segment AB when it is on line AB and between A and B.
  const secondSegmentStartTouchesFirstSegment =
    Math.abs(secondSegmentStartRelativeToFirstSegmentLine) <= EPSILON &&
    isPointOnSegment(firstSegmentStart, secondSegmentStart, firstSegmentEnd)
  // D lies on segment AB when it is on line AB and between A and B.
  const secondSegmentEndTouchesFirstSegment =
    Math.abs(secondSegmentEndRelativeToFirstSegmentLine) <= EPSILON &&
    isPointOnSegment(firstSegmentStart, secondSegmentEnd, firstSegmentEnd)
  // A lies on segment CD when it is on line CD and between C and D.
  const firstSegmentStartTouchesSecondSegment =
    Math.abs(firstSegmentStartRelativeToSecondSegmentLine) <= EPSILON &&
    isPointOnSegment(secondSegmentStart, firstSegmentStart, secondSegmentEnd)
  // B lies on segment CD when it is on line CD and between C and D.
  const firstSegmentEndTouchesSecondSegment =
    Math.abs(firstSegmentEndRelativeToSecondSegmentLine) <= EPSILON &&
    isPointOnSegment(secondSegmentStart, firstSegmentEnd, secondSegmentEnd)

  return (
    secondSegmentStartTouchesFirstSegment ||
    secondSegmentEndTouchesFirstSegment ||
    firstSegmentStartTouchesSecondSegment ||
    firstSegmentEndTouchesSecondSegment
  )
}

/**
 * Builds consecutive path edges and optionally adds the closing edge.
 *
 * @param points - Ordered path vertices without a repeated closing coordinate.
 * @param closed - Whether to connect the final vertex back to the first.
 * @returns Ordered pairs representing each path segment.
 *
 * @example
 * ```text
 * Open A→B→C:   AB, BC
 * Closed A→B→C: AB, BC, CA
 * ```
 */
const getSegments = (points: IMapBoundaryCoordinate[], closed: boolean) => {
  const segments = points.slice(1).map((point, index) => [points[index], point] as const)
  const lastPoint = points.at(-1)
  if (closed && points.length > 2 && lastPoint) segments.push([lastPoint, points[0]])
  return segments
}

/**
 * Checks whether two connected edges lie on the same line and retrace each other.
 *
 * @param points - Path points without a repeated closing point.
 * @param closed - Whether to also check the edges connected through the first point.
 * @returns Whether any two connected edges overlap.
 *
 * @example
 * ```text
 * Path order: A → B → C
 *
 * No overlap—the path keeps moving forward:
 * A────B────C
 *
 * Overlap—the path reaches B, then moves backward to C:
 * A────C────B
 *      C←───B  (this part retraces the A→B edge)
 * ```
 */
const hasAdjacentOverlap = (points: IMapBoundaryCoordinate[], closed: boolean) => {
  const connectedEdgePoints: [
    IMapBoundaryCoordinate,
    IMapBoundaryCoordinate,
    IMapBoundaryCoordinate,
  ][] = points.slice(2).map((edgeEnd, index) => [points[index], points[index + 1], edgeEnd])
  const finalPoint = points.at(-1)
  const pointBeforeFinal = points.at(-2)
  if (closed && points.length > 2 && finalPoint && pointBeforeFinal) {
    connectedEdgePoints.push([pointBeforeFinal, finalPoint, points[0]])
    connectedEdgePoints.push([finalPoint, points[0], points[1]])
  }

  return connectedEdgePoints.some(([edgeStart, sharedVertex, edgeEnd]) => {
    const edgesAreOnSameLine = Math.abs(orientation(edgeStart, sharedVertex, edgeEnd)) <= EPSILON
    if (!edgesAreOnSameLine) return false

    // The second edge ends within the first edge, so it retraces part of the first edge.
    const secondEdgeEndsInsideFirstEdge = isPointOnSegment(edgeStart, edgeEnd, sharedVertex)
    // The first edge starts within the second edge, so the second edge retraces the first edge.
    const firstEdgeStartsInsideSecondEdge = isPointOnSegment(sharedVertex, edgeStart, edgeEnd)

    return secondEdgeEndsInsideFirstEdge || firstEdgeStartsInsideSecondEdge
  })
}

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
const getSegmentIntersectionParameters = (
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
const isSegmentInBoundary = (
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

/**
 * Rounds a world-coordinate component to two decimal places for serialization.
 *
 * @param value - Coordinate component to round.
 * @returns The component rounded to at most two decimal places.
 *
 * @example
 * ```text
 * 1.234 ──round──▶ 1.23
 * 9.999 ──round──▶ 10
 * ```
 */
const roundCoordinate = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

/**
 * Builds the API boundary envelope, rounding coordinates and repeating the first vertex.
 * Does not validate geometry after rounding; empty input produces one empty polygon.
 *
 * @param points - World vertices without a repeated closing point.
 * @returns One explicitly closed polygon for nonempty input.
 *
 * @example
 * ```text
 * Input:  A → B → C
 * Output: A → B → C → A
 *         first point is repeated to close the polygon
 * ```
 */
export const serializeBoundary = (points: IMapBoundaryCoordinate[]): IMapBoundaries => {
  const polygon: IMapBoundaryPolygon = points.map(([x, y]) => [
    roundCoordinate(x),
    roundCoordinate(y),
  ])
  const firstPoint = polygon[0]
  if (firstPoint) polygon.push([...firstPoint])
  return [polygon]
}

/**
 * Builds an explicitly closed rectangular polygon covering the entire map.
 *
 * @param dimensionX - Map width in meters.
 * @param dimensionY - Map height in meters.
 * @returns A single polygon in the API boundary envelope.
 *
 * @example
 * ```text
 * (0,y)────────(x,y)
 *   │              │
 * (0,0)────────(x,0)
 * Output order: (0,0) → (x,0) → (x,y) → (0,y) → (0,0)
 * ```
 */
export const getFullMapBoundaries = (dimensionX: number, dimensionY: number): IMapBoundaries => [
  [
    [0, 0],
    [dimensionX, 0],
    [dimensionX, dimensionY],
    [0, dimensionY],
    [0, 0],
  ],
]

/**
 * Initializes the boundary editor without mutating the map's saved geometry.
 * Creation, missing geometry, and polygons with no rings use full-map coverage.
 * Adjustment copies a valid single ring and removes its repeated closing vertex,
 * if present. Unsupported or invalid geometry produces an empty, blocked Custom state.
 *
 * @param map - Saved geometry and map dimensions in world-coordinate meters.
 * @param mode - Whether to start creation defaults or load the saved boundary for adjustment.
 * @returns Editor vertices, closure state, method, and whether saving must be blocked.
 *
 * @example
 * ```text
 * Create or no geometry ──▶ DIMENSIONS, empty editable points
 * Valid saved polygon   ──▶ CUSTOM, closed copied points
 * Invalid geometry      ──▶ CUSTOM, unsupported = true
 * ```
 */
export function getInitialBoundary(
  map: IMapListInfo,
  mode: 'create' | 'adjust',
): InitialBoundaryState {
  const geometry = mode === 'adjust' ? map.geometry : undefined
  if (!geometry || (geometry.type === GeometryType.POLYGON && geometry.coordinates.length === 0)) {
    return { points: [], closed: false, unsupported: false, method: MapBoundarySource.DIMENSIONS }
  }
  const points = (geometry.coordinates[0] ?? []).map(([x, y]): IMapBoundaryCoordinate => [x, y])
  const firstPoint = points[0]
  const lastPoint = points.at(-1)
  if (firstPoint && lastPoint && firstPoint[0] === lastPoint[0] && firstPoint[1] === lastPoint[1]) {
    points.pop()
  }
  const unsupported =
    geometry.type !== GeometryType.POLYGON ||
    geometry.coordinates.length !== 1 ||
    !isValidBoundaryPolygon(points, true) ||
    points.some(
      ([x, y]) =>
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        x < 0 ||
        y < 0 ||
        x > map.dimension_x ||
        y > map.dimension_y,
    )
  return {
    points: unsupported ? [] : points,
    closed: !unsupported,
    unsupported,
    method: MapBoundarySource.CUSTOM,
  }
}
