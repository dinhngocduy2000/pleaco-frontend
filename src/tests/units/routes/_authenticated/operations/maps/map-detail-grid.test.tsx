import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DockingStationHeading, GeometryType, MapStatus, MapZoneType } from '@/enum/maps'
import type { IMapDetailInfo } from '@/interface/maps'
import { getLocale, setLocale } from '@/paraglide/runtime.js'

const positionQuery = vi.hoisted(() =>
  vi.fn(
    (): {
      data?: {
        requestRevision?: number
        data: {
          robots: {
            id: string
            name: string
            position: { x: number; y: number; updated_at: string } | null
          }[]
        }
      }
      error: { response: { status: number } } | null
      isError: boolean
    } => ({ data: undefined, error: null, isError: false }),
  ),
)
vi.mock('@/queries/use-maps-query', () => ({ useMapRobotPositionsQuery: positionQuery }))
vi.mock('@/hooks/use-map-robot-positions-socket', () => ({
  useMapRobotPositionsSocket: (_mapId: string, _groupId: string, robots: unknown[]) => robots,
}))

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
  it('passes fresh positions and hides them after access is denied', () => {
    const robots = [{ id: 'r1', name: 'Robot', position: { x: 2, y: 3, updated_at: '2026-01-01' } }]
    positionQuery.mockReturnValue({ data: { data: { robots } }, error: null, isError: false })
    const view = render(<MapDetailGrid map={map} groupId="group-1" />)
    expect(editor).toHaveBeenLastCalledWith(expect.objectContaining({ robotPositions: robots }))
    positionQuery.mockReturnValue({
      data: { data: { robots } },
      error: { response: { status: 403 } },
      isError: true,
    })
    view.rerender(<MapDetailGrid map={map} groupId="group-1" />)
    expect(editor).toHaveBeenLastCalledWith(expect.objectContaining({ robotPositions: [] }))
    positionQuery.mockReturnValue({ data: undefined, error: null, isError: false })
  })

  it.each([
    ['en', 'Robot positions could not refresh.'],
    ['vi', 'Không thể cập nhật vị trí robot.'],
  ] as const)('announces a position refresh error in %s', async (locale, message) => {
    positionQuery.mockReturnValueOnce({
      error: { response: { status: 500 } },
      isError: true,
    })
    const previous = getLocale()
    await setLocale(locale, { reload: false })
    try {
      render(<MapDetailGrid map={map} groupId="group-1" />)
      expect(screen.getByRole('status')).toHaveTextContent(message)
    } finally {
      await setLocale(previous, { reload: false })
    }
  })

  it('configures the boundary editor as read-only with saved boundary and zones', () => {
    render(<MapDetailGrid map={map} groupId="group-1" />)

    expect(screen.getByTestId('map-boundary-editor')).toBeInTheDocument()
    expect(editor).toHaveBeenCalledWith(
      expect.objectContaining({
        interaction: { mode: 'view' },
        layout: expect.objectContaining({
          showBoundary: true,
          boundary: {
            closed: true,
            points: [
              [1, 1],
              [10, 1],
              [1, 8],
            ],
          },
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
      }),
    )
  })
})
