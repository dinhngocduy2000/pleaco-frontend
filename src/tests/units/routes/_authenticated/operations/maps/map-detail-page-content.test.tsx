import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { GeometryType, MapStatus, MapZoneType } from '@/enum/maps'
import { ROBOT_CONNECTION_STATUS, ROBOT_OPERATION_STATUS, RobotModel } from '@/enum/robot'
import type { IMapDetailInfo } from '@/interface/maps'

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()

  return {
    ...actual,
    Link: ({ children }: { children: ReactNode }) => <a href="/operations/maps">{children}</a>,
    createFileRoute: () => () => ({}),
  }
})
vi.mock('@/routes/_authenticated/operations/components/maps/detail/-map-detail-grid', () => ({
  MapDetailGrid: ({ map }: { map: IMapDetailInfo }) => (
    <section className="order-first" data-testid="map-detail-grid">
      {map.zones.length} zones
    </section>
  ),
}))

import {
  getBoundaryEditorPoints,
  getZoneCounts,
} from '@/routes/_authenticated/operations/components/maps/detail/-map-detail-utils'
import { MapDetailPageContent } from '@/routes/_authenticated/operations/maps/$map_id'

const map: IMapDetailInfo = {
  id: 'map-1',
  name: 'Warehouse — Floor 1',
  description: 'Main warehouse cleaning area',
  status: MapStatus.ASSIGNED,
  dimension_x: 24,
  dimension_y: 18,
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-10T00:00:00.000Z',
  tags: [{ id: 'tag-1', name: 'Warehouse' }],
  boundary: {
    type: GeometryType.POLYGON,
    coordinates: [
      [
        [0, 0],
        [24, 0],
        [24, 18],
        [0, 0],
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
    {
      id: 'zone-2',
      type: MapZoneType.NO_GO,
      geometry: {
        type: GeometryType.POLYGON,
        coordinates: [
          [
            [8, 2],
            [10, 2],
            [8, 4],
            [8, 2],
          ],
        ],
      },
    },
  ],
  robots: [
    {
      id: 'robot-1',
      name: 'Atlas 01',
      serial_num: 'PLC-PRO-00018',
      model: RobotModel.PRO,
      connection_status: ROBOT_CONNECTION_STATUS.ONLINE,
      operational_status: ROBOT_OPERATION_STATUS.EXECUTING,
    },
  ],
}

describe('MapDetailPageContent', () => {
  it('renders map metadata, compact robots, and a first-ordered map grid', () => {
    render(<MapDetailPageContent error={false} isLoading={false} map={map} />)

    expect(screen.getByRole('heading', { level: 1, name: map.name })).toBeInTheDocument()
    expect(screen.getByText('Map Details')).toBeInTheDocument()
    expect(screen.getByText('24m × 18m')).toBeInTheDocument()
    expect(screen.getByText('1 Obstacles')).toBeInTheDocument()
    expect(screen.getByText('1 No-go zones')).toBeInTheDocument()
    expect(screen.getByText('Warehouse')).toBeInTheDocument()
    expect(screen.getByTestId('map-detail-grid')).toHaveClass('order-first')
    expect(screen.getByText('Atlas 01')).toBeInTheDocument()
    expect(screen.getByText('PLC-PRO-00018')).toBeInTheDocument()
    expect(screen.getByText('Executing')).toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Online' })).toHaveClass('bg-green-600')
    expect(screen.getByRole('button', { name: 'Edit Metadata' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Manage Robot Assignment' })).toBeInTheDocument()
  })

  it('renders a dedicated failure state', () => {
    render(<MapDetailPageContent error isLoading={false} />)

    expect(screen.getByText('Unable to load map details.')).toBeInTheDocument()
    expect(screen.getByText('Try returning to Maps and opening the map again.')).toBeInTheDocument()
  })

  it('renders a loading state before map data is available', () => {
    render(<MapDetailPageContent error={false} isLoading />)

    expect(screen.getByText('Loading map details…')).toBeInTheDocument()
  })
})

describe('map detail geometry helpers', () => {
  it('removes GeoJSON closing coordinates and counts every environment-zone type', () => {
    expect(getBoundaryEditorPoints(map.boundary)).toEqual([
      [0, 0],
      [24, 0],
      [24, 18],
    ])
    expect(getZoneCounts(map.zones)).toEqual({
      [MapZoneType.OBSTACLE]: 1,
      [MapZoneType.NO_GO]: 1,
      [MapZoneType.CLEANING_ZONE]: 0,
    })
  })
})
