import { describe, expect, it } from 'vitest'
import { GeometryType, MapZoneType } from '@/enum/maps'
import type { Geometry } from '@/interface/maps'
import { getLayoutIssues } from '@/routes/_authenticated/operations/components/maps/map-preview-editor/model/-layout-issues'
import { createEmptyZoneDrafts } from '@/routes/_authenticated/operations/components/maps/map-preview-editor/model/-layout-types'

const boundary: [number, number][] = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
]
const square = (left: number, right: number): Geometry => ({
  type: GeometryType.POLYGON,
  coordinates: [
    [
      [left, 1],
      [right, 1],
      [right, 3],
      [left, 3],
      [left, 1],
    ],
  ],
})

describe('getLayoutIssues', () => {
  it('marks both completed zones when they overlap', () => {
    const issues = getLayoutIssues(
      [
        { clientId: 'a', zoneType: MapZoneType.OBSTACLE, to_delete: false, geometry: square(1, 3) },
        { clientId: 'b', zoneType: MapZoneType.NO_GO, to_delete: false, geometry: square(2, 4) },
      ],
      createEmptyZoneDrafts(),
      boundary,
      true,
    )

    expect(issues.map(({ key, overlap }) => [key, overlap])).toEqual([
      ['a', true],
      ['b', true],
    ])
  })

  it('marks an open draft outside the boundary', () => {
    const drafts = createEmptyZoneDrafts()
    drafts.CLEANING_ZONE.points = [[11, 2]]

    expect(getLayoutIssues([], drafts, boundary, true)).toEqual([
      { key: 'draft-CLEANING_ZONE', points: [[11, 2]], overlap: false, outsideBoundary: true },
    ])
  })
})
