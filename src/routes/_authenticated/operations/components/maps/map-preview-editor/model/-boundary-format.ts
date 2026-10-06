import { GeometryType, MapBoundarySource } from '@/enum/maps'

import type {
  IMapBoundaries,
  IMapBoundaryCoordinate,
  IMapBoundaryPolygon,
  IMapListInfo,
} from '@/interface/maps'

import { isValidBoundaryPolygon } from '../geometry/-polygons'

export type IMapBoundaryEditorMap = Pick<
  IMapListInfo,
  'id' | 'name' | 'dimension_x' | 'dimension_y' | 'geometry'
>

export type InitialBoundaryState = {
  points: IMapBoundaryCoordinate[]
  closed: boolean
  unsupported: boolean
  method: MapBoundarySource
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
  map: IMapBoundaryEditorMap,
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
