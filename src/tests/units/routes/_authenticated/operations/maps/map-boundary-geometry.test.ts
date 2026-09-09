import { describe, expect, it } from 'vitest'
import { GeometryType, MapBoundarySource } from '@/enum/maps'
import type { Geometry, IMapListInfo } from '@/interface/maps'
import {
  canCommitBoundaryPoints,
  canvasPointToWorld,
  clampBoundaryCoordinate,
  clampCanvasPoint,
  doesPathOverlapPolygons,
  flattenCanvasPoints,
  getBoundaryPointUpdate,
  getFullMapBoundaries,
  getInitialBoundary,
  getMovedBoundaryPoints,
  getPolygonArea,
  hasMinimumCanvasMovement,
  hasSelfIntersection,
  isCanvasPointWithinTolerance,
  isPathContainedInBoundary,
  isPointInBoundary,
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

  it('accepts paths inside or touching the boundary and rejects outside vertices', () => {
    const boundary: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ]

    expect(isPointInBoundary([0, 5], boundary)).toBe(true)
    expect(
      isPathContainedInBoundary(
        [
          [0, 2],
          [4, 2],
          [4, 6],
          [0, 6],
        ],
        boundary,
        true,
      ),
    ).toBe(true)
    expect(isPathContainedInBoundary([[11, 5]], boundary, false)).toBe(false)
  })

  it('rejects a segment that exits a concave boundary between valid endpoints', () => {
    const concaveBoundary: [number, number][] = [
      [0, 0],
      [6, 0],
      [6, 6],
      [4, 6],
      [4, 2],
      [2, 2],
      [2, 6],
      [0, 6],
    ]

    expect(isPointInBoundary([1, 5], concaveBoundary)).toBe(true)
    expect(isPointInBoundary([5, 5], concaveBoundary)).toBe(true)
    expect(
      isPathContainedInBoundary(
        [
          [1, 5],
          [5, 5],
        ],
        concaveBoundary,
        false,
      ),
    ).toBe(false)
  })

  it('detects points, crossings, contact, and containment overlapping another polygon', () => {
    const existingZone: [number, number][] = [
      [2, 2],
      [6, 2],
      [6, 6],
      [2, 6],
    ]

    expect(doesPathOverlapPolygons([[3, 3]], false, [existingZone])).toBe(true)
    expect(
      doesPathOverlapPolygons(
        [
          [1, 4],
          [7, 4],
        ],
        false,
        [existingZone],
      ),
    ).toBe(true)
    expect(doesPathOverlapPolygons([[2, 4]], false, [existingZone])).toBe(true)
    expect(
      doesPathOverlapPolygons(
        [
          [1, 1],
          [7, 1],
          [7, 7],
          [1, 7],
        ],
        true,
        [existingZone],
      ),
    ).toBe(true)
    expect(
      doesPathOverlapPolygons(
        [
          [7, 7],
          [9, 7],
          [9, 9],
        ],
        true,
        [existingZone],
      ),
    ).toBe(false)
  })
})

describe('getInitialBoundary', () => {
  const map: IMapListInfo = {
    id: 'map-1',
    name: 'Warehouse',
    description: null,
    status: 'UNASSIGNED',
    tags: [],
    dimension_x: 20,
    dimension_y: 12,
    updated_at: '2026-09-05T00:00:00Z',
  }
  const geometry: Geometry = {
    type: GeometryType.POLYGON,
    coordinates: [
      [
        [1, 1],
        [8, 1],
        [4, 8],
        [1, 1],
      ],
    ],
  }
  const fullMap = {
    points: [],
    closed: false,
    unsupported: false,
    method: MapBoundarySource.DIMENSIONS,
  }

  it('ignores saved geometry during creation', () => {
    expect(getInitialBoundary({ ...map, geometry }, 'create')).toEqual(fullMap)
  })

  it('defaults to dimensions for missing geometry or a polygon with no rings', () => {
    expect(getInitialBoundary(map, 'adjust')).toEqual(fullMap)
    expect(
      getInitialBoundary({ ...map, geometry: { ...geometry, coordinates: [] } }, 'adjust'),
    ).toEqual(fullMap)
  })

  it.each([true, false])('loads a valid ring with repeated closing vertex: %s', (repeated) => {
    const saved = structuredClone(geometry)
    if (!repeated) saved.coordinates[0].pop()
    const original = structuredClone(saved)
    const result = getInitialBoundary({ ...map, geometry: saved }, 'adjust')
    expect(result).toEqual({
      points: [
        [1, 1],
        [8, 1],
        [4, 8],
      ],
      closed: true,
      unsupported: false,
      method: MapBoundarySource.CUSTOM,
    })
    expect(saved).toEqual(original)
    result.points[0][0] = 5
    expect(saved).toEqual(original)
  })

  it('accepts a rectangle on the inclusive map bounds as Custom', () => {
    const points = getFullMapBoundaries(map.dimension_x, map.dimension_y)
    expect(
      getInitialBoundary({ ...map, geometry: { ...geometry, coordinates: points } }, 'adjust'),
    ).toEqual({
      points: points[0].slice(0, -1),
      closed: true,
      unsupported: false,
      method: MapBoundarySource.CUSTOM,
    })
  })

  it.each<Geometry>([
    { ...geometry, type: GeometryType.POINT },
    { ...geometry, type: GeometryType.LINE_STRING },
    { ...geometry, coordinates: [geometry.coordinates[0], geometry.coordinates[0]] },
    { ...geometry, coordinates: [[]] },
    {
      ...geometry,
      coordinates: [
        [
          [1, 1],
          [2, 2],
        ],
      ],
    },
    {
      ...geometry,
      coordinates: [
        [
          [1, 1],
          [2, 2],
          [3, 3],
        ],
      ],
    },
    {
      ...geometry,
      coordinates: [
        [
          [1, 1],
          [8, 8],
          [1, 8],
          [8, 1],
        ],
      ],
    },
    {
      ...geometry,
      coordinates: [
        [
          [1, 1],
          [8, 1],
          [8, 1],
          [4, 8],
        ],
      ],
    },
    ...[
      [-1, 1],
      [1, -1],
      [21, 1],
      [1, 13],
      [Number.NaN, 1],
      [1, Number.POSITIVE_INFINITY],
    ].map(
      ([x, y]): Geometry => ({
        ...geometry,
        coordinates: [
          [
            [x, y],
            [8, 1],
            [4, 8],
          ],
        ],
      }),
    ),
  ])('blocks unsupported or invalid geometry %#', (invalid) => {
    expect(getInitialBoundary({ ...map, geometry: invalid }, 'adjust')).toEqual({
      points: [],
      closed: false,
      unsupported: true,
      method: MapBoundarySource.CUSTOM,
    })
  })
})
