import type { IMapBoundaryCoordinate } from '@/interface/maps'

/** Tolerance for coordinate equality, collinearity, and degenerate polygon area checks. */
export const EPSILON = 1e-8

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
export const coordinatesEqual = (
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
export const hasDuplicateCoordinates = (points: IMapBoundaryCoordinate[]) =>
  points.some((point, index) =>
    points.slice(index + 1).some((other) => coordinatesEqual(point, other)),
  )

/**
 * Calculates the signed turn formed by three ordered coordinates.
 *
 * @param pathStart - Coordinate where the path enters the turn.
 * @param turnPoint - Shared coordinate where the direction may change.
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
export const orientation = (
  pathStart: IMapBoundaryCoordinate,
  turnPoint: IMapBoundaryCoordinate,
  pathEnd: IMapBoundaryCoordinate,
) =>
  (turnPoint[1] - pathStart[1]) * (pathEnd[0] - turnPoint[0]) -
  (turnPoint[0] - pathStart[0]) * (pathEnd[1] - turnPoint[1])

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
export const isPointOnSegment = (
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
export const segmentsIntersect = (
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
export const getSegments = (points: IMapBoundaryCoordinate[], closed: boolean) => {
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
export const hasAdjacentOverlap = (points: IMapBoundaryCoordinate[], closed: boolean) => {
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
