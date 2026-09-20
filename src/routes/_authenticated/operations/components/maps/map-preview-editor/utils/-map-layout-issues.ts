import type { IMapBoundaryCoordinate } from '@/interface/maps'
import { doesPathOverlapPolygons, isPathContainedInBoundary } from './-map-boundary-geometry'
import type { IMapZoneDrafts, IMapZoneShape } from './-map-zone-types'

export type MapLayoutIssue = {
  key: string
  points: IMapBoundaryCoordinate[]
  overlap: boolean
  outsideBoundary: boolean
}

/** Re-evaluate restored geometry without rejecting a history transition. */
export function getLayoutIssues(
  zones: IMapZoneShape[],
  drafts: IMapZoneDrafts,
  boundary: IMapBoundaryCoordinate[],
  boundaryClosed: boolean,
): MapLayoutIssue[] {
  const shapes = [
    ...zones
      .filter((zone) => !zone.to_delete)
      .map((zone) => ({
        key: zone.clientId,
        points: zone.geometry.coordinates[0].slice(0, -1),
        closed: true,
      })),
    ...Object.entries(drafts)
      .filter(([, draft]) => draft.points.length > 0)
      .map(([type, draft]) => ({
        key: `draft-${type}`,
        points: draft.points,
        closed: false,
      })),
  ]
  const overlaps = new Set<string>()
  for (const shape of shapes) {
    for (const other of shapes) {
      if (shape.key === other.key || !other.closed) continue
      if (doesPathOverlapPolygons(shape.points, shape.closed, [other.points])) {
        overlaps.add(shape.key)
        overlaps.add(other.key)
      }
    }
  }
  return shapes
    .map((shape) => ({
      key: shape.key,
      points: shape.points,
      overlap: overlaps.has(shape.key),
      outsideBoundary:
        !boundaryClosed || !isPathContainedInBoundary(shape.points, boundary, shape.closed),
    }))
    .filter((issue) => issue.overlap || issue.outsideBoundary)
}
