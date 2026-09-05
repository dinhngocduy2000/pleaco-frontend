import type { IMapBoundaries, IMapBoundaryCoordinate, IMapBoundaryPolygon } from '@/interface/maps'

const EPSILON = 1e-8

export type MapCanvasPoint = { x: number; y: number }

type BoundaryPointUpdate = {
  points: IMapBoundaryCoordinate[]
  closed: boolean
}

const coordinatesEqual = (first: IMapBoundaryCoordinate, second: IMapBoundaryCoordinate) =>
  Math.abs(first[0] - second[0]) < EPSILON && Math.abs(first[1] - second[1]) < EPSILON

const hasDuplicateCoordinates = (points: IMapBoundaryCoordinate[]) =>
  points.some((point, index) =>
    points.slice(index + 1).some((other) => coordinatesEqual(point, other)),
  )

const orientation = (
  first: IMapBoundaryCoordinate,
  second: IMapBoundaryCoordinate,
  third: IMapBoundaryCoordinate,
) =>
  (second[1] - first[1]) * (third[0] - second[0]) - (second[0] - first[0]) * (third[1] - second[1])

const isPointOnSegment = (
  first: IMapBoundaryCoordinate,
  point: IMapBoundaryCoordinate,
  second: IMapBoundaryCoordinate,
) =>
  point[0] <= Math.max(first[0], second[0]) + EPSILON &&
  point[0] >= Math.min(first[0], second[0]) - EPSILON &&
  point[1] <= Math.max(first[1], second[1]) + EPSILON &&
  point[1] >= Math.min(first[1], second[1]) - EPSILON

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

const getSegments = (points: IMapBoundaryCoordinate[], closed: boolean) => {
  const segments = points.slice(1).map((point, index) => [points[index], point] as const)
  const lastPoint = points.at(-1)
  if (closed && points.length > 2 && lastPoint) segments.push([lastPoint, points[0]])
  return segments
}

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

export const getPolygonArea = (points: IMapBoundaryCoordinate[]) => {
  if (points.length < 3) return 0

  return Math.abs(
    points.reduce((area, point, index) => {
      const nextPoint = points[(index + 1) % points.length]
      return area + point[0] * nextPoint[1] - nextPoint[0] * point[1]
    }, 0) / 2,
  )
}

export const isValidBoundaryPolygon = (points: IMapBoundaryCoordinate[], closed: boolean) => {
  if (!closed || points.length < 3 || getPolygonArea(points) <= EPSILON) return false
  if (hasDuplicateCoordinates(points)) return false
  return !hasSelfIntersection(points, true)
}

export const canCommitBoundaryPoints = (points: IMapBoundaryCoordinate[], closed: boolean) => {
  if (hasDuplicateCoordinates(points)) return false
  if (hasSelfIntersection(points, closed)) return false
  return !closed || isValidBoundaryPolygon(points, true)
}

export const clampBoundaryCoordinate = (
  coordinate: IMapBoundaryCoordinate,
  dimensionX: number,
  dimensionY: number,
): IMapBoundaryCoordinate => [
  Math.min(dimensionX, Math.max(0, coordinate[0])),
  Math.min(dimensionY, Math.max(0, coordinate[1])),
]

export const canvasPointToWorld = (
  point: MapCanvasPoint,
  dimensionY: number,
  pixelsPerMeter: number,
): IMapBoundaryCoordinate => [point.x / pixelsPerMeter, dimensionY - point.y / pixelsPerMeter]

export const worldPointToCanvas = (
  coordinate: IMapBoundaryCoordinate,
  dimensionY: number,
  pixelsPerMeter: number,
): MapCanvasPoint => ({
  x: coordinate[0] * pixelsPerMeter,
  y: (dimensionY - coordinate[1]) * pixelsPerMeter,
})

export const flattenCanvasPoints = (points: MapCanvasPoint[]) =>
  points.flatMap((point) => [point.x, point.y])

export const clampCanvasPoint = (
  point: MapCanvasPoint,
  mapWidth: number,
  mapHeight: number,
  padding = 0,
): MapCanvasPoint => ({
  x: Math.min(mapWidth, Math.max(0, point.x - padding)),
  y: Math.min(mapHeight, Math.max(0, point.y - padding)),
})

export const hasMinimumCanvasMovement = (
  start: MapCanvasPoint,
  end: MapCanvasPoint,
  threshold: number,
) => Math.hypot(end.x - start.x, end.y - start.y) >= threshold

export const isCanvasPointWithinTolerance = (
  first: MapCanvasPoint,
  second: MapCanvasPoint,
  tolerance: number,
) => Math.hypot(second.x - first.x, second.y - first.y) <= tolerance

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

const roundCoordinate = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

export const serializeBoundary = (points: IMapBoundaryCoordinate[]): IMapBoundaries => {
  const polygon: IMapBoundaryPolygon = points.map(([x, y]) => [
    roundCoordinate(x),
    roundCoordinate(y),
  ])
  const firstPoint = polygon[0]
  if (firstPoint) polygon.push([...firstPoint])
  return [polygon]
}

export const getFullMapBoundaries = (dimensionX: number, dimensionY: number): IMapBoundaries => [
  [
    [0, 0],
    [dimensionX, 0],
    [dimensionX, dimensionY],
    [0, dimensionY],
    [0, 0],
  ],
]
