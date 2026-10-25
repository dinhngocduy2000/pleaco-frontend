import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DockingStationHeading, GeometryType, MapStatus, MapZoneType } from '@/enum/maps'
import type { IMapDetailInfo } from '@/interface/maps'

const editor = vi.hoisted(() => vi.fn())
vi.mock(
  '@/routes/_authenticated/operations/components/maps/map-preview-editor/-map-boundary-editor',
  () => ({
    MapBoundaryEditor: (props: unknown) => {
      editor(props)
      const editorProps = props as {
        onZoneContextMenu?: (zone: unknown) => void
        layout: { zones: { zoneType: string }[] }
      }
      return (
        <button
          type="button"
          data-testid="map-boundary-editor"
          onContextMenu={() =>
            editorProps.onZoneContextMenu?.(
              editorProps.layout.zones.find((zone) => zone.zoneType === 'DOCKING_STATION'),
            )
          }
        />
      )
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

it('opens docking actions, disables occupied assignment and edits the target station', async () => {
  const edit = vi.fn()
  render(<MapDetailGrid map={map} canManage groupId="group-1" onEdit={edit} />)
  fireEvent.contextMenu(screen.getByTestId('map-boundary-editor'), { clientX: 120, clientY: 80 })
  expect(screen.getByRole('menuitem', { name: 'Assign robot' })).toHaveAttribute('data-disabled')
  fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }))
  await waitFor(() => expect(edit).toHaveBeenCalledWith('station-1'))
})
