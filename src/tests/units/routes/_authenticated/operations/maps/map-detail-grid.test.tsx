import { act, fireEvent, render, screen } from '@testing-library/react'
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
    render(
      <MapDetailGrid
        canManageDockingStations
        map={map}
        onAssignRobot={vi.fn()}
        onEditLayout={vi.fn()}
      />,
    )

    expect(screen.getByTestId('map-boundary-editor')).toBeInTheDocument()
    expect(editor).toHaveBeenCalledWith(
      expect.objectContaining({
        interaction: expect.objectContaining({ mode: 'view' }),
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

  it('opens actions for a docking station and ignores other zones', () => {
    const onAssignRobot = vi.fn()
    const onEditLayout = vi.fn()
    render(
      <MapDetailGrid
        canManageDockingStations
        map={map}
        onAssignRobot={onAssignRobot}
        onEditLayout={onEditLayout}
      />,
    )
    const editorProps = editor.mock.calls.at(-1)?.[0]
    expect(editorProps).toBeDefined()
    const interaction = (
      editorProps as {
        interaction: {
          onZoneContextMenu: (zoneId: string, position: { x: number; y: number }) => void
          onBackgroundContextMenu: () => void
        }
      }
    ).interaction
    const mapRegion = screen.getByRole('region', { name: 'Warehouse' })

    fireEvent.contextMenu(mapRegion, { button: 2, clientX: 10, clientY: 20 })
    act(() => interaction.onZoneContextMenu('zone-1', { x: 10, y: 20 }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    fireEvent.contextMenu(mapRegion, { button: 2, clientX: 10, clientY: 20 })
    act(() => interaction.onZoneContextMenu('station-1', { x: 10, y: 20 }))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument()
    act(() => interaction.onBackgroundContextMenu())
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    fireEvent.contextMenu(mapRegion, { button: 2, clientX: 10, clientY: 20 })
    act(() => interaction.onZoneContextMenu('station-1', { x: 10, y: 20 }))
    act(() => screen.getByRole('menuitem', { name: 'Edit' }).click())
    expect(onEditLayout).toHaveBeenCalledOnce()

    act(() => interaction.onZoneContextMenu('station-1', { x: 10, y: 20 }))
    act(() => screen.getByRole('menuitem', { name: 'Assign Robot' }).click())
    expect(onAssignRobot).toHaveBeenCalledWith('station-1')
  })

  it('does not show actions for a docking station without management access', () => {
    render(
      <MapDetailGrid
        canManageDockingStations={false}
        map={map}
        onAssignRobot={vi.fn()}
        onEditLayout={vi.fn()}
      />,
    )
    const editorProps = editor.mock.calls.at(-1)?.[0]
    expect(editorProps).toBeDefined()
    const interaction = (
      editorProps as {
        interaction: {
          onZoneContextMenu: (zoneId: string, position: { x: number; y: number }) => void
          onBackgroundContextMenu: () => void
        }
      }
    ).interaction
    fireEvent.contextMenu(screen.getByRole('region', { name: 'Warehouse' }), {
      button: 2,
      clientX: 10,
      clientY: 20,
    })
    act(() => interaction.onZoneContextMenu('station-1', { x: 10, y: 20 }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
