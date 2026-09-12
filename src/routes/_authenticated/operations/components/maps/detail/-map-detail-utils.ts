import { MapStatus, MapZoneType } from '@/enum/maps'
import type { IMapBoundaryCoordinate, IMapDetailInfo } from '@/interface/maps'

/**
 * Returns the status-specific classes used by the map detail status badge.
 *
 * Assigned maps use the success palette; every other status uses the warning palette.
 *
 * @param status - Current lifecycle status of the map.
 * @returns Tailwind classes for the status badge in light and dark themes.
 */
export const getMapDetailStatusClassName = (status: IMapDetailInfo['status']) =>
  status === MapStatus.ASSIGNED
    ? 'border-green-700! bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
    : 'border-yellow-700! bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300'

/**
 * Produces the vertices displayed by the boundary editor.
 *
 * GeoJSON-style polygon rings repeat their first coordinate as the final coordinate to close the
 * shape. The editor closes the shape itself, so that duplicate endpoint is removed. Missing
 * boundaries and empty rings produce an empty point list.
 *
 * @param boundary - Optional polygon boundary stored on the map.
 * @returns Boundary vertices without a duplicated closing coordinate.
 */
export const getBoundaryEditorPoints = (
  boundary: IMapDetailInfo['boundary'],
): IMapBoundaryCoordinate[] => {
  const boundaryPoints = boundary?.coordinates[0] ?? []
  const startPoint = boundaryPoints[0]
  const endPoint = boundaryPoints.at(-1)

  if (startPoint && endPoint && startPoint[0] === endPoint[0] && startPoint[1] === endPoint[1]) {
    return boundaryPoints.slice(0, -1)
  }

  return boundaryPoints
}

/**
 * Counts map zones by the zone types displayed in the map metadata card.
 *
 * @param zones - Zones configured for the map.
 * @returns Counts keyed by obstacle, no-go, and cleaning-zone types.
 */
export const getZoneCounts = (zones: IMapDetailInfo['zones']) => ({
  [MapZoneType.OBSTACLE]: zones.filter((zone) => zone.type === MapZoneType.OBSTACLE).length,
  [MapZoneType.NO_GO]: zones.filter((zone) => zone.type === MapZoneType.NO_GO).length,
  [MapZoneType.CLEANING_ZONE]: zones.filter((zone) => zone.type === MapZoneType.CLEANING_ZONE)
    .length,
})
