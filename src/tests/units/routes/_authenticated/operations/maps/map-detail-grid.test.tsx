import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DockingStationHeading, GeometryType, MapStatus, MapZoneType } from '@/enum/maps'
import type { IMapDetailInfo } from '@/interface/maps'

const editor = vi.hoisted(() => vi.fn())
vi.mock(
  '@/routes/_authenticated/operations/components/maps/map-preview-editor/-map-boundary-editor',
  () => ({
    MapBoundaryEditor: (props: unknown) => {
      editor(props)
      return <div data-testid="map-boundary-editor" />
    },
  }),
)

import { MapDetailGrid } from '@/routes/_authenticated/operations/components/maps/detail/-map-detail-grid'

const map = {
  id: 'map-1',
  name: 'Warehouse',
  description: null,
  status: MapStatus.UNASSIGNED,
  dimension_x: 20,
  dimension_y: 12,
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
  tags: [],
  robots: [],
  boundary: {
    type: GeometryType.POLYGON,
    coordinates: [
      [
        [1, 1],
        [10, 1],
        [1, 8],
        [1, 1],
      ],
    ],
  },
  zones: [
    {
      id: 'zone-1',
      type: MapZoneType.OBSTACLE,
      geometry: {
        type: GeometryType.POLYGON,
        coordinates: [
          [
            [2, 2],
            [4, 2],
            [2, 4],
            [2, 2],
          ],
        ],
      },
    },
  ],
  docking_stations: [
    {
      id: 'station-1',
      robot_id: 'robot-1',
      heading: DockingStationHeading.NORTH,
      geometry: {
        type: GeometryType.POLYGON,
        coordinates: [
          [
            [5, 5],
            [9, 5],
            [9, 9],
            [5, 9],
            [5, 5],
          ],
        ],
      },
    },
  ],
} satisfies IMapDetailInfo

describe('MapDetailGrid', () => {
  it('configures the boundary editor as read-only with saved boundary and zones', () => {
    render(<MapDetailGrid map={map} />)

    expect(screen.getByTestId('map-boundary-editor')).toBeInTheDocument()
    expect(editor).toHaveBeenCalledWith(
      expect.objectContaining({
        interactive: false,
        showBoundary: true,
        boundaryClosed: true,
        boundaryPoints: [
          [1, 1],
          [10, 1],
          [1, 8],
        ],
        zones: [
          expect.objectContaining({ clientId: 'zone-1', zoneType: MapZoneType.OBSTACLE }),
          expect.objectContaining({
            clientId: 'station-1',
            id: 'station-1',
            zoneType: 'DOCKING_STATION',
            heading: DockingStationHeading.NORTH,
            robot_id: 'robot-1',
          }),
        ],
      }),
    )
  })
})
