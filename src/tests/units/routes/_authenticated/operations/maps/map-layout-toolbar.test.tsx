import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MapZoneType } from '@/enum/maps'
import { MapLayoutToolbar } from '@/routes/_authenticated/operations/components/maps/-map-layout-toolbar'
import { MAP_ZONE_STYLES } from '@/routes/_authenticated/operations/components/maps/-map-zone-types'

describe('MapLayoutToolbar', () => {
  it('defines the required boundary and zone color schemas', () => {
    expect(MAP_ZONE_STYLES).toEqual({
      BOUNDARY: { stroke: '#7C3AED', fill: 'transparent', strokeWidth: 3 },
      OBSTACLE: {
        stroke: '#F59E0B',
        fill: 'rgba(245, 158, 11, 0.20)',
        strokeWidth: 2,
      },
      NO_GO: {
        stroke: '#EF4444',
        fill: 'rgba(239, 68, 68, 0.16)',
        strokeWidth: 2,
        dash: [8, 6],
      },
      CLEANING_ZONE: {
        stroke: '#3B82F6',
        fill: 'rgba(59, 130, 246, 0.12)',
        strokeWidth: 2,
      },
    })
  })

  it('exposes all tools and reports drawing and delete actions', async () => {
    const user = userEvent.setup()
    const onToolChange = vi.fn()
    const onDelete = vi.fn()
    render(
      <MapLayoutToolbar
        activeTool={MapZoneType.BOUNDARY}
        deleteDisabled={false}
        disabled={false}
        zoneToolsDisabled={false}
        onDelete={onDelete}
        onToolChange={onToolChange}
      />,
    )

    expect(screen.getByRole('toolbar', { name: 'Map layout tools' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Boundary' })).toHaveAttribute('aria-pressed', 'true')
    for (const name of ['Obstacle', 'No-go', 'Cleaning zone', 'Select']) {
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'false')
    }

    await user.click(screen.getByRole('button', { name: 'No-go' }))
    await user.click(screen.getByRole('button', { name: 'Delete selected zone' }))
    expect(onToolChange).toHaveBeenCalledWith(MapZoneType.NO_GO)
    expect(onDelete).toHaveBeenCalledOnce()
  })

  it('keeps Boundary available when zone tools are unavailable', () => {
    render(
      <MapLayoutToolbar
        activeTool={MapZoneType.BOUNDARY}
        deleteDisabled
        disabled={false}
        zoneToolsDisabled
        onDelete={vi.fn()}
        onToolChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Boundary' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Obstacle' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Select' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Delete selected zone' })).toBeDisabled()
  })
})
