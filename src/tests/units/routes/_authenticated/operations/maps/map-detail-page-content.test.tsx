import { render, screen } from '@testing-library/react'
import { type ComponentType, type ReactNode, Suspense } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GeometryType, MapStatus, MapZoneType } from '@/enum/maps'
import { ROBOT_CONNECTION_STATUS, ROBOT_OPERATION_STATUS, RobotModel } from '@/enum/robot'
import type { IMapDetailInfo } from '@/interface/maps'

const { useMapDetailQueryMock, useProfileQueryMock, useRouteParamsMock } = vi.hoisted(() => ({
  useMapDetailQueryMock: vi.fn(),
  useProfileQueryMock: vi.fn(),
  useRouteParamsMock: vi.fn(),
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()

  return {
    ...actual,
    Link: ({ children }: { children: ReactNode }) => <a href="/operations/maps">{children}</a>,
    createFileRoute: () => (options: { component: () => ReactNode }) => ({
      options,
      useParams: useRouteParamsMock,
    }),
  }
})
vi.mock('@/queries/use-auth-query', () => ({ useProfileQuery: useProfileQueryMock }))
vi.mock('@/queries/use-maps-query', () => ({ useMapDetailQuery: useMapDetailQueryMock }))
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
import { Route } from '@/routes/_authenticated/operations/maps/$map_id'

const MapDetailPage = (Route as unknown as { options: { component: ComponentType } }).options
  .component

const renderMapDetailPage = async () => {
  const preloadablePage = MapDetailPage as ComponentType & { preload?: () => Promise<void> }
  await preloadablePage.preload?.()

  return render(
    <Suspense fallback={null}>
      <MapDetailPage />
    </Suspense>,
  )
}

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

describe('MapDetailPage', () => {
  beforeEach(() => {
    useRouteParamsMock.mockReturnValue({ map_id: 'map-1' })
    useProfileQueryMock.mockReturnValue({ data: { data: { group_id: 'group-1' } } })
    useMapDetailQueryMock.mockReturnValue({
      data: { data: map },
      isError: false,
      isLoading: false,
    })
  })

  it('renders map metadata, compact robots, and a first-ordered map grid', async () => {
    await renderMapDetailPage()

    expect(useMapDetailQueryMock).toHaveBeenCalledWith('map-1', 'group-1')
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

  it('renders a dedicated failure state', async () => {
    useMapDetailQueryMock.mockReturnValue({ data: undefined, isError: true, isLoading: false })
    await renderMapDetailPage()

    expect(screen.getByText('Unable to load map details.')).toBeInTheDocument()
    expect(screen.getByText('Try returning to Maps and opening the map again.')).toBeInTheDocument()
  })

  it('renders a loading state before map data is available', async () => {
    useMapDetailQueryMock.mockReturnValue({ data: undefined, isError: false, isLoading: true })
    await renderMapDetailPage()

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
