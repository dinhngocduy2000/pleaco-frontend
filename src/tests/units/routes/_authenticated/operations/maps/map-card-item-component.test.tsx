import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { GeometryType, MapStatus } from '@/enum/maps'
import type { Geometry, IMapListInfo } from '@/interface/maps'

vi.mock('@/routes/_authenticated/operations/components/maps/-map-grid-preview', () => ({
  MapGridPreview: ({
    dimensionX,
    dimensionY,
    geometry,
  }: {
    dimensionX: number
    dimensionY: number
    geometry?: Geometry
  }) => (
    <div
      data-dimensions={`${dimensionX}x${dimensionY}`}
      data-geometry={JSON.stringify(geometry)}
      data-testid="map-grid-preview"
    />
  ),
}))

import {
  formatMapUpdatedAt,
  MapCardItemComponent,
} from '@/routes/_authenticated/operations/components/maps/-map-card-item-component'

const map: IMapListInfo = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Warehouse — Floor 1',
  description: 'Primary warehouse cleaning area',
  status: MapStatus.ASSIGNED,
  dimension_x: 20,
  dimension_y: 12,
  updated_at: '2026-08-29T09:55:00.000Z',
  geometry: {
    type: GeometryType.POLYGON,
    coordinates: [
      [
        [1, 1],
        [8, 1],
        [4, 8],
        [1, 1],
      ],
    ],
  },
  tags: [
    { id: 'tag-1', name: 'Warehouse', color: '#000000' },
    { id: 'tag-2', name: 'Floor 1', color: '#000000' },
    { id: 'tag-3', name: 'Day Shift', color: '#000000' },
    { id: 'tag-4', name: 'Priority', color: '#000000' },
    { id: 'tag-5', name: 'Restricted', color: '#000000' },
  ],
}

describe('MapCardItemComponent', () => {
  it('renders the grid, metadata, tags, and action menu', async () => {
    const user = userEvent.setup()

    render(<MapCardItemComponent map={map} />)

    expect(screen.getByTestId('map-grid-preview')).toHaveAttribute('data-dimensions', '20x12')
    expect(screen.getByTestId('map-grid-preview')).toHaveAttribute(
      'data-geometry',
      JSON.stringify(map.geometry),
    )
    expect(screen.getByRole('heading', { name: map.name })).toBeInTheDocument()
    expect(screen.getByText(MapStatus.ASSIGNED)).toHaveClass('bg-green-50', 'text-green-700')
    expect(screen.getByText(map.description ?? '')).toHaveClass('line-clamp-2')
    expect(screen.getByText('20 × 12')).toBeInTheDocument()
    expect(screen.getByText('Warehouse')).toBeInTheDocument()
    expect(screen.getByText('Priority')).toBeInTheDocument()
    expect(screen.queryByText('Restricted')).not.toBeInTheDocument()
    expect(screen.getByText('+ 1')).toBeInTheDocument()
    expect(screen.getByText(/^Updated /)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Map options' }))

    expect(await screen.findByText('View details')).toBeInTheDocument()
    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('uses an em dash when the updated timestamp is invalid', () => {
    expect(formatMapUpdatedAt('not-a-date')).toBe('—')
  })
})
