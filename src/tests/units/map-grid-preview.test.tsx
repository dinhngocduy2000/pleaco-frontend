import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-konva', () => ({
  Circle: () => null,
  Layer: ({ children }: { children: ReactNode }) => <>{children}</>,
  Line: () => null,
  Rect: () => null,
  Stage: ({ children, height, width }: { children: ReactNode; height: number; width: number }) => (
    <div data-height={height} data-testid="map-grid-stage" data-width={width}>
      {children}
    </div>
  ),
}))

import {
  getMapGridPreviewGeometry,
  MapGridPreview,
} from '@/routes/_authenticated/operations/components/maps/-map-grid-preview'

describe('getMapGridPreviewGeometry', () => {
  it('creates a 10-pixel grid for integer meter dimensions', () => {
    expect(getMapGridPreviewGeometry(20, 12)).toEqual({
      stageWidth: 240,
      stageHeight: 160,
      mapWidth: 200,
      mapHeight: 120,
      verticalGridLines: Array.from({ length: 21 }, (_, index) => index * 10),
      horizontalGridLines: Array.from({ length: 13 }, (_, index) => index * 10),
      corners: [
        { x: 0, y: 0 },
        { x: 200, y: 0 },
        { x: 0, y: 120 },
        { x: 200, y: 120 },
      ],
    })
  })

  it('adds a final boundary for fractional-meter dimensions', () => {
    const geometry = getMapGridPreviewGeometry(2.5, 1.2)

    expect(geometry?.verticalGridLines).toEqual([0, 10, 20, 25])
    expect(geometry?.horizontalGridLines).toEqual([0, 10, 12])
    expect(geometry?.corners.at(-1)).toEqual({ x: 25, y: 12 })
  })

  it('scales map geometry and grid spacing', () => {
    const zoomedOut = getMapGridPreviewGeometry(20, 12, 0.5)
    const zoomedIn = getMapGridPreviewGeometry(20, 12, 3)

    expect(zoomedOut).toMatchObject({
      stageWidth: 140,
      stageHeight: 100,
      mapWidth: 100,
      mapHeight: 60,
      verticalGridLines: Array.from({ length: 21 }, (_, index) => index * 5),
      horizontalGridLines: Array.from({ length: 13 }, (_, index) => index * 5),
    })
    expect(zoomedIn).toMatchObject({
      stageWidth: 640,
      stageHeight: 400,
      mapWidth: 600,
      mapHeight: 360,
      corners: [
        { x: 0, y: 0 },
        { x: 600, y: 0 },
        { x: 0, y: 360 },
        { x: 600, y: 360 },
      ],
    })
  })
})

describe('MapGridPreview', () => {
  it('shows guidance until both dimensions are valid, then renders the grid stage', () => {
    const { rerender } = render(<MapGridPreview dimensionX={undefined} dimensionY={12} />)

    expect(
      screen.getByText('Enter positive width and height to preview the map.'),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('map-grid-stage')).not.toBeInTheDocument()

    rerender(<MapGridPreview dimensionX={20} dimensionY={12} />)

    expect(
      screen.queryByText('Enter positive width and height to preview the map.'),
    ).not.toBeInTheDocument()
    expect(screen.getByTestId('map-grid-stage')).toHaveAttribute('data-width', '240')
    expect(screen.getByTestId('map-grid-stage')).toHaveAttribute('data-height', '160')
  })

  it('changes preview scale in 0.5 increments within the supported bounds', async () => {
    const user = userEvent.setup()
    render(<MapGridPreview dimensionX={20} dimensionY={12} />)

    expect(screen.getByText('1.0×')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(screen.getByText('1.5×')).toBeInTheDocument()
    expect(screen.getByTestId('map-grid-stage')).toHaveAttribute('data-width', '340')

    await user.click(screen.getByRole('button', { name: 'Zoom out' }))
    await user.click(screen.getByRole('button', { name: 'Zoom out' }))
    expect(screen.getByText('0.5×')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeDisabled()

    for (let index = 0; index < 5; index += 1) {
      await user.click(screen.getByRole('button', { name: 'Zoom in' }))
    }

    expect(screen.getByText('3.0×')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeDisabled()
  })

  it('renders the card preview as a fixed, non-scrollable viewport without zoom controls', () => {
    render(<MapGridPreview dimensionX={20} dimensionY={12} variant="card" />)

    expect(screen.getByTestId('map-card-grid-preview')).toHaveClass('h-[250px]', 'overflow-hidden')
    expect(screen.getByTestId('map-grid-stage')).toHaveAttribute('data-width', '360')
    expect(screen.getByTestId('map-grid-stage')).toHaveAttribute('data-height', '250')
    expect(screen.queryByRole('button', { name: 'Zoom in' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Zoom out' })).not.toBeInTheDocument()
  })
})
