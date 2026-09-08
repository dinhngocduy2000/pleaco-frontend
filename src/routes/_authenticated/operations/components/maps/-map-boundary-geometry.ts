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

/** Compares both world-coordinate components using the floating-point tolerance. */
const coordinatesEqual = (first: IMapBoundaryCoordinate, second: IMapBoundaryCoordinate) =>
  Math.abs(first[0] - second[0]) < EPSILON && Math.abs(first[1] - second[1]) < EPSILON

/** Detects repeated vertices anywhere in the boundary, including nonadjacent vertices. */
const hasDuplicateCoordinates = (points: IMapBoundaryCoordinate[]) =>
  points.some((point, index) =>
    points.slice(index + 1).some((other) => coordinatesEqual(point, other)),
  )

/** Returns a signed turn value: positive clockwise, negative counterclockwise, zero collinear. */
const orientation = (
  first: IMapBoundaryCoordinate,
  second: IMapBoundaryCoordinate,
  third: IMapBoundaryCoordinate,
) =>
  (second[1] - first[1]) * (third[0] - second[0]) - (second[0] - first[0]) * (third[1] - second[1])

/** Checks inclusive segment bounds with tolerance. The caller must establish collinearity. */
const isPointOnSegment = (
  first: IMapBoundaryCoordinate,
  point: IMapBoundaryCoordinate,
  second: IMapBoundaryCoordinate,
) =>
  point[0] <= Math.max(first[0], second[0]) + EPSILON &&
  point[0] >= Math.min(first[0], second[0]) - EPSILON &&
  point[1] <= Math.max(first[1], second[1]) + EPSILON &&
  point[1] >= Math.min(first[1], second[1]) - EPSILON

/** Detects crossings, endpoint touches, and collinear overlaps between two segments. */
const segmentsIntersect = (
  firstStart: IMapBoundaryCoordinate,
  firstEnd: IMapBoundaryCoordinate,
  secondStart: IMapBoundaryCoordinate,
  secondEnd: IMapBoundaryCoordinate,
) => {
  const firstOrientation = orientation(firstStart, firstEnd, secondStart)
  const secondOrientation = orientation(firstStart, firstEnd, secondEnd)
  const thirdOrientation = orientation(secondStart, secondEnd, firstStart)
  const fourthOrientation = orientation(secondStart, secondEnd, firstEnd)

  if (
    ((firstOrientation > EPSILON && secondOrientation < -EPSILON) ||
      (firstOrientation < -EPSILON && secondOrientation > EPSILON)) &&
    ((thirdOrientation > EPSILON && fourthOrientation < -EPSILON) ||
      (thirdOrientation < -EPSILON && fourthOrientation > EPSILON))
  ) {
    return true
  }

  return (
    (Math.abs(firstOrientation) <= EPSILON &&
      isPointOnSegment(firstStart, secondStart, firstEnd)) ||
    (Math.abs(secondOrientation) <= EPSILON && isPointOnSegment(firstStart, secondEnd, firstEnd)) ||
    (Math.abs(thirdOrientation) <= EPSILON &&
      isPointOnSegment(secondStart, firstStart, secondEnd)) ||
    (Math.abs(fourthOrientation) <= EPSILON && isPointOnSegment(secondStart, firstEnd, secondEnd))
  )
}

/** Builds consecutive edges, adding the last-to-first edge for closed boundaries with 3+ vertices. */
const getSegments = (points: IMapBoundaryCoordinate[], closed: boolean) => {
  const segments = points.slice(1).map((point, index) => [points[index], point] as const)
  const lastPoint = points.at(-1)
  if (closed && points.length > 2 && lastPoint) segments.push([lastPoint, points[0]])
  return segments
}

/** Detects collinear backtracking across neighboring edges, including the closing seam. */
const hasAdjacentOverlap = (points: IMapBoundaryCoordinate[], closed: boolean) => {
  const triples: [IMapBoundaryCoordinate, IMapBoundaryCoordinate, IMapBoundaryCoordinate][] = points
    .slice(2)
    .map((point, index) => [points[index], points[index + 1], point])
  const lastPoint = points.at(-1)
  const previousPoint = points.at(-2)
  if (closed && points.length > 2 && lastPoint && previousPoint) {
    triples.push([previousPoint, lastPoint, points[0]])
    triples.push([lastPoint, points[0], points[1]])
  }

  return triples.some(([first, shared, second]) => {
    if (Math.abs(orientation(first, shared, second)) > EPSILON) return false
    return isPointOnSegment(first, second, shared) || isPointOnSegment(shared, first, second)
  })
}

/**
 * Detects overlapping adjacent edges and intersections between nonadjacent edges.
 * Normal shared endpoints of adjacent edges are allowed.
 *
 * @param points - Ordered world-coordinate vertices without a repeated closing point.
 * @param closed - Whether to include the last-to-first edge.
 */
export const hasSelfIntersection = (points: IMapBoundaryCoordinate[], closed: boolean) => {
  if (hasAdjacentOverlap(points, closed)) return true
  const segments = getSegments(points, closed)

  return segments.some((segment, firstIndex) =>
    segments.some((candidate, secondIndex) => {
      if (secondIndex <= firstIndex) return false
      if (Math.abs(firstIndex - secondIndex) === 1) return false
      if (closed && firstIndex === 0 && secondIndex === segments.length - 1) return false
      return segmentsIntersect(segment[0], segment[1], candidate[0], candidate[1])
    }),
  )
}

/**
 * Computes absolute shoelace area in square meters, implicitly closing the polygon.
 *
 * @param points - Ordered world-coordinate vertices in meters.
 * @returns Zero for fewer than three vertices; self-intersecting inputs may cancel area.
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
 */
export const isValidBoundaryPolygon = (points: IMapBoundaryCoordinate[], closed: boolean) => {
  if (!closed || points.length < 3 || getPolygonArea(points) <= EPSILON) return false
  if (hasDuplicateCoordinates(points)) return false
  return !hasSelfIntersection(points, true)
}

/** Returns whether a point is inside a polygon or lies on one of its edges. */
export const isPointInBoundary = (
  point: IMapBoundaryCoordinate,
  boundary: IMapBoundaryCoordinate[],
) => {
  if (boundary.length < 3) return false
  let inside = false

  for (let index = 0; index < boundary.length; index += 1) {
    const start = boundary[index]
    const end = boundary[(index + 1) % boundary.length]
    if (
      Math.abs(orientation(start, point, end)) <= EPSILON &&
      isPointOnSegment(start, point, end)
    ) {
      return true
    }

    const crossesRay =
      start[1] > point[1] !== end[1] > point[1] &&
      point[0] < ((end[0] - start[0]) * (point[1] - start[1])) / (end[1] - start[1]) + start[0]
    if (crossesRay) inside = !inside
  }

  return inside
}

/** Finds positions along a path segment where it intersects a boundary segment. */
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

/** Checks one complete segment by sampling every interval split by boundary intersections. */
const isSegmentInBoundary = (
  start: IMapBoundaryCoordinate,
  end: IMapBoundaryCoordinate,
  boundary: IMapBoundaryCoordinate[],
) => {
  if (!isPointInBoundary(start, boundary) || !isPointInBoundary(end, boundary)) return false
  const parameters = [0, 1]
  for (let index = 0; index < boundary.length; index += 1) {
    parameters.push(
      ...getSegmentIntersectionParameters(
        start,
        end,
        boundary[index],
        boundary[(index + 1) % boundary.length],
      ),
    )
  }
  const sortedParameters = parameters
    .sort((first, second) => first - second)
    .filter((parameter, index, values) => index === 0 || parameter - values[index - 1] > EPSILON)

  return sortedParameters.slice(1).every((parameter, index) => {
    const midpoint = (sortedParameters[index] + parameter) / 2
    return isPointInBoundary(
      [start[0] + (end[0] - start[0]) * midpoint, start[1] + (end[1] - start[1]) * midpoint],
      boundary,
    )
  })
}

/** Checks every vertex and segment of an open or closed path against a polygon boundary. */
export const isPathContainedInBoundary = (
  points: IMapBoundaryCoordinate[],
  boundary: IMapBoundaryCoordinate[],
  closed: boolean,
) => {
  if (points.length === 0) return true
  if (!points.every((point) => isPointInBoundary(point, boundary))) return false
  const segments = getSegments(points, closed)
  return segments.every(([start, end]) => isSegmentInBoundary(start, end, boundary))
}

/**
 * Validates an editor update, allowing incomplete open paths, including an empty path.
 *
 * @param points - Proposed world-coordinate vertices without a repeated closing point.
 * @param closed - Whether to require a complete, valid polygon.
 * @returns False for duplicate vertices, intersections, or an invalid closed polygon.
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
 * @param start - Initial canvas position.
 * @param end - Current canvas position in the same coordinate space.
 * @param threshold - Minimum Euclidean distance in pixels.
 */
export const hasMinimumCanvasMovement = (
  start: MapCanvasPoint,
  end: MapCanvasPoint,
  threshold: number,
) => Math.hypot(end.x - start.x, end.y - start.y) >= threshold

/**
 * Checks whether two canvas positions are within an inclusive pixel radius.
 *
 * @param first - Reference canvas position.
 * @param second - Candidate position in the same coordinate space.
 * @param tolerance - Maximum Euclidean distance in pixels.
 */
export const isCanvasPointWithinTolerance = (
  first: MapCanvasPoint,
  second: MapCanvasPoint,
  tolerance: number,
) => Math.hypot(second.x - first.x, second.y - first.y) <= tolerance

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

/** Rounds a world-coordinate component to two decimal places for serialization. */
const roundCoordinate = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

/**
 * Builds the API boundary envelope, rounding coordinates and repeating the first vertex.
 * Does not validate geometry after rounding; empty input produces one empty polygon.
 *
 * @param points - World vertices without a repeated closing point.
 * @returns One explicitly closed polygon for nonempty input.
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
  const first = points[0]
  const last = points.at(-1)
  if (first && last && first[0] === last[0] && first[1] === last[1]) points.pop()
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
