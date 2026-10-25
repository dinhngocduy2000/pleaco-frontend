import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DockingStationHeading, GeometryType, MapStatus } from '@/enum/maps'
import { ROBOT_CONNECTION_STATUS, ROBOT_OPERATION_STATUS, RobotModel } from '@/enum/robot'
import type { IMapDetailInfo } from '@/interface/maps'

const mutateAsync = vi.hoisted(() => vi.fn())
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('@/queries/use-maps-query', () => ({
  useAssignDockingStationRobotMutation: () => ({ mutateAsync, isPending: false }),
}))
vi.mock('sonner', () => ({ toast }))

import { MapAssignRobotDialog } from '@/routes/_authenticated/operations/components/maps/detail/-map-assign-robot-dialog'

const map: IMapDetailInfo = {
  id: 'map-1',
  name: 'Warehouse',
  description: null,
  status: MapStatus.ASSIGNED,
  dimension_x: 20,
  dimension_y: 20,
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
  tags: [],
  boundary: null,
  zones: [],
  robots: ['robot-1', 'robot-2'].map((id, index) => ({
    id,
    name: `Robot ${index + 1}`,
    serial_num: `SN-${index + 1}`,
    model: RobotModel.PRO,
    connection_status: ROBOT_CONNECTION_STATUS.ONLINE,
    operational_status: ROBOT_OPERATION_STATUS.IDLE,
  })),
  docking_stations: [
    {
      id: 'station-1',
      robot_id: null,
      heading: DockingStationHeading.NORTH,
      geometry: { type: GeometryType.POLYGON, coordinates: [] },
    },
    {
      id: 'station-2',
      robot_id: 'robot-2',
      heading: DockingStationHeading.NORTH,
      geometry: { type: GeometryType.POLYGON, coordinates: [] },
    },
  ],
}

describe('MapAssignRobotDialog', () => {
  beforeEach(() => vi.clearAllMocks())

  it('selects available robots, disables those assigned elsewhere, and sends the selected id', async () => {
    const user = userEvent.setup()
    const setOpen = vi.fn()
    mutateAsync.mockResolvedValue(undefined)
    render(
      <MapAssignRobotDialog
        map={map}
        open
        setOpen={setOpen}
        station={{ ...map.docking_stations[0], robot_id: null }}
      />,
    )

    const robotOne = screen.getByRole('button', { name: /Robot 1/ })
    const robotTwo = screen.getByRole('button', { name: /Robot 2/ })
    expect(robotOne).toBeEnabled()
    expect(robotTwo).toBeDisabled()
    expect(robotOne).toHaveAttribute('aria-pressed', 'false')
    await user.click(robotOne)
    expect(robotOne).toHaveClass('border-2', 'border-green-600!')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(mutateAsync).toHaveBeenCalledWith({
      map_id: 'map-1',
      docking_id: 'station-1',
      robot_id: 'robot-1',
    })
    expect(toast.success).toHaveBeenCalledWith('Robot assigned to docking station.')
    expect(setOpen).toHaveBeenCalledWith(false)
  })

  it('keeps the dialog open and displays an error when assignment fails', async () => {
    const user = userEvent.setup()
    mutateAsync.mockRejectedValue(new Error('Request failed'))
    render(
      <MapAssignRobotDialog
        map={map}
        open
        setOpen={vi.fn()}
        station={{ ...map.docking_stations[0], robot_id: null }}
      />,
    )
    await user.click(screen.getByRole('button', { name: /Robot 1/ }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to assign the robot')
    expect(toast.error).toHaveBeenCalledWith('Unable to assign the robot. Please try again.')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows the current assignment and prevents replacing it', () => {
    render(
      <MapAssignRobotDialog map={map} open setOpen={vi.fn()} station={map.docking_stations[1]} />,
    )

    expect(screen.getByRole('button', { name: /Robot 2/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })
})
