import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DockingStationHeading, GeometryType, MapStatus } from '@/enum/maps'
import { ROBOT_CONNECTION_STATUS, ROBOT_OPERATION_STATUS, RobotModel } from '@/enum/robot'
import type { IMapDetailInfo } from '@/interface/maps'

const mutation = vi.hoisted(() => ({
  mutate: vi.fn(),
  isPending: false,
  callbacks: {} as { onSuccess?: () => void; onError?: (error: unknown) => void },
}))
const toastError = vi.hoisted(() => vi.fn())
vi.mock('@/queries/use-maps-query', () => ({
  useAssignDockingStationRobotMutation: (callbacks: typeof mutation.callbacks) => {
    mutation.callbacks = callbacks
    return mutation
  },
}))
vi.mock('sonner', () => ({ toast: { error: toastError, success: vi.fn() } }))

import { MapAssignRobotDialog } from '@/routes/_authenticated/operations/components/maps/detail/-map-assign-robot-dialog'

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
  boundary: null,
  zones: [],
  robots: [
    {
      id: 'robot-1',
      name: 'Offline robot',
      serial_num: 'SN-1',
      model: RobotModel.LITE,
      connection_status: ROBOT_CONNECTION_STATUS.OFFLINE,
      operational_status: ROBOT_OPERATION_STATUS.EXECUTING,
    },
    {
      id: 'robot-2',
      name: 'Busy robot',
      serial_num: 'SN-2',
      model: RobotModel.STANDARD,
      connection_status: ROBOT_CONNECTION_STATUS.ONLINE,
      operational_status: ROBOT_OPERATION_STATUS.EXECUTING,
    },
  ],
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
} satisfies IMapDetailInfo

describe('MapAssignRobotDialog', () => {
  beforeEach(() => {
    mutation.mutate.mockReset()
    mutation.callbacks = {}
    mutation.isPending = false
    toastError.mockReset()
  })

  it('allows one offline or busy robot, disables robots assigned elsewhere, and submits the exact assignment', async () => {
    const user = userEvent.setup()
    const setOpen = vi.fn()
    render(
      <MapAssignRobotDialog
        open
        setOpen={setOpen}
        map={map}
        groupId="group-1"
        dockingId="station-1"
      />,
    )

    const selectableRobot = screen.getByRole('button', { name: /offline robot/i })
    const assignedRobot = screen.getByRole('button', { name: /busy robot/i })
    expect(assignedRobot).toBeDisabled()
    expect(screen.getByText(/already assigned to another docking station/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()

    await user.click(selectableRobot)
    expect(selectableRobot).toHaveAttribute('aria-pressed', 'true')
    expect(selectableRobot.className).toContain('border-green-600')
    expect(screen.getByRole('button', { name: /save/i })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(mutation.mutate).toHaveBeenCalledWith({
      map_id: 'map-1',
      docking_id: 'station-1',
      group_id: 'group-1',
      robot_id: 'robot-1',
    })
    mutation.callbacks.onSuccess?.()
    expect(setOpen).toHaveBeenCalledWith(false)
  })

  it('shows the empty state and keeps save disabled when the map has no robots', () => {
    render(
      <MapAssignRobotDialog
        open
        setOpen={vi.fn()}
        map={{ ...map, robots: [] }}
        groupId="group-1"
        dockingId="station-1"
      />,
    )

    expect(screen.getByText(/no robots are assigned to this map/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
  })

  it('disables closing and saving while the mutation is pending', () => {
    mutation.isPending = true
    render(
      <MapAssignRobotDialog
        open
        setOpen={vi.fn()}
        map={map}
        groupId="group-1"
        dockingId="station-1"
      />,
    )

    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /assigning/i })).toBeDisabled()
  })

  it('retains the dialog and presents the existing error toast after a failed assignment', async () => {
    const user = userEvent.setup()
    const setOpen = vi.fn()
    render(
      <MapAssignRobotDialog
        open
        setOpen={setOpen}
        map={map}
        groupId="group-1"
        dockingId="station-1"
      />,
    )

    await user.click(screen.getByRole('button', { name: /offline robot/i }))
    await user.click(screen.getByRole('button', { name: /save/i }))

    mutation.callbacks.onError?.(new Error('request failed'))
    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(setOpen).not.toHaveBeenCalledWith(false)
  })
})
