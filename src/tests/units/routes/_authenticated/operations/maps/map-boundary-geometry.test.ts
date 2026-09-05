import { describe, expect, it } from 'vitest'
import {
  canCommitBoundaryPoints,
  canvasPointToWorld,
  clampBoundaryCoordinate,
  clampCanvasPoint,
  flattenCanvasPoints,
  getBoundaryPointUpdate,
  getFullMapBoundaries,
  getMovedBoundaryPoints,
  getPolygonArea,
  hasMinimumCanvasMovement,
  hasSelfIntersection,
  isCanvasPointWithinTolerance,
  isValidBoundaryPolygon,
  serializeBoundary,
  worldPointToCanvas,
} from '@/routes/_authenticated/operations/components/maps/-map-boundary-geometry'

describe('map boundary geometry', () => {
  it('converts between bottom-left world coordinates and canvas coordinates at any zoom', () => {
    const coordinate: [number, number] = [4.25, 7.5]

    for (const pixelsPerMeter of [5, 10, 30]) {
      const canvasPoint = worldPointToCanvas(coordinate, 12, pixelsPerMeter)
      expect(canvasPointToWorld(canvasPoint, 12, pixelsPerMeter)).toEqual(coordinate)
    }
  })

  it('normalizes canvas points and movement calculations', () => {
    expect(clampCanvasPoint({ x: 15, y: 140 }, 100, 100, 20)).toEqual({ x: 0, y: 100 })
    expect(
      flattenCanvasPoints([
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ]),
    ).toEqual([1, 2, 3, 4])
    expect(hasMinimumCanvasMovement({ x: 0, y: 0 }, { x: 3, y: 4 }, 5)).toBe(true)
    expect(isCanvasPointWithinTolerance({ x: 0, y: 0 }, { x: 3, y: 4 }, 5)).toBe(true)
  })

  it('builds add, close, and valid vertex-move updates', () => {
    const points: [number, number][] = [
      [1, 1],
      [8, 1],
      [4, 8],
    ]
    const canvasPoints = points.map((point) => worldPointToCanvas(point, 10, 10))
    const commonUpdateInput = {
      canvasPoints,
      points,
      dimensionX: 10,
      dimensionY: 10,
      pixelsPerMeter: 10,
      closureTolerance: 10,
    }

    expect(
      getBoundaryPointUpdate({
        ...commonUpdateInput,
        canvasPoint: { x: 90, y: 50 },
      }),
    ).toEqual({
      points: [...points, [9, 5]],
      closed: false,
    })
    expect(
      getBoundaryPointUpdate({
        ...commonUpdateInput,
        canvasPoint: { x: canvasPoints[0].x + 5, y: canvasPoints[0].y },
      }),
    ).toEqual({ points, closed: true })
    expect(
      getMovedBoundaryPoints({
        points,
        index: 2,
        canvasPoint: { x: 50, y: 10 },
        dimensionX: 10,
        dimensionY: 10,
        pixelsPerMeter: 10,
        closed: true,
      }),
    ).toEqual([
      [1, 1],
      [8, 1],
      [5, 9],
    ])
  })

  it('clamps coordinates to the map dimensions', () => {
    expect(clampBoundaryCoordinate([-2, 14], 20, 12)).toEqual([0, 12])
    expect(clampBoundaryCoordinate([21, -1], 20, 12)).toEqual([20, 0])
  })

  it('creates a closed rectangle for the full map area', () => {
    expect(getFullMapBoundaries(20, 12)).toEqual([
      [
        [0, 0],
        [20, 0],
        [20, 12],
        [0, 12],
        [0, 0],
      ],
    ])
  })

  it('rounds custom coordinates to two decimals and closes the polygon once', () => {
    expect(
      serializeBoundary([
        [1.234, 2.345],
        [8.888, 2],
        [4, 9.999],
      ]),
    ).toEqual([
      [
        [1.23, 2.35],
        [8.89, 2],
        [4, 10],
        [1.23, 2.35],
      ],
    ])
  })

  it('requires three unique non-collinear points and a closed shape', () => {
    const triangle: [number, number][] = [
      [0, 0],
      [5, 0],
      [2, 4],
    ]

    expect(getPolygonArea(triangle)).toBe(10)
    expect(isValidBoundaryPolygon(triangle, false)).toBe(false)
    expect(isValidBoundaryPolygon(triangle, true)).toBe(true)
    expect(
      isValidBoundaryPolygon(
        [
          [0, 0],
          [2, 0],
          [4, 0],
        ],
        true,
      ),
    ).toBe(false)
  })

  it('rejects duplicate consecutive points and self-intersections', () => {
    expect(
      canCommitBoundaryPoints(
        [
          [0, 0],
          [2, 0],
          [2, 0],
        ],
        false,
      ),
    ).toBe(false)
    expect(
      canCommitBoundaryPoints(
        [
          [0, 0],
          [4, 0],
          [2, 0],
        ],
        false,
      ),
    ).toBe(false)
    expect(
      canCommitBoundaryPoints(
        [
          [0, 0],
          [2, 0],
          [2, 2],
          [0, 0],
        ],
        false,
      ),
    ).toBe(false)

    const bowTie: [number, number][] = [
      [0, 0],
      [4, 4],
      [0, 4],
      [4, 0],
    ]
    expect(hasSelfIntersection(bowTie, true)).toBe(true)
    expect(isValidBoundaryPolygon(bowTie, true)).toBe(false)
  })
})
