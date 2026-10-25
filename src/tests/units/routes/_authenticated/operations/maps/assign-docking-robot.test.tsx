import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { IMapDetailInfo } from '@/interface/maps'

const mutate = vi.hoisted(() => vi.fn())
vi.mock('@/queries/use-maps-query', () => ({
  useAssignDockingRobotMutation: () => ({ mutateAsync: mutate, isPending: false }),
}))

import { AssignDockingRobotDialog } from '@/routes/_authenticated/operations/components/maps/detail/-assign-docking-robot-dialog'

const first = '00000000-0000-4000-8000-000000000001'
const second = '00000000-0000-4000-8000-000000000002'
const map = {
  id: 'map-1',
  robots: [first, second].map((id, index) => ({
    id,
    name: `Robot ${index + 1}`,
    serial_num: `SERIAL-${index}`,
    model: 'PRO',
    connection_status: 'ONLINE',
    operational_status: 'IDLE',
  })),
  docking_stations: [{ id: 'dock-1', robot_id: null }],
} as IMapDetailInfo

describe('docking robot assignment', () => {
  beforeEach(() => {
    mutate.mockReset()
  })
  it('selects exactly one robot and saves its UUID, then closes', async () => {
    const user = userEvent.setup()
    const close = vi.fn()
    mutate.mockResolvedValue(undefined)
    render(
      <AssignDockingRobotDialog map={map} dockingId="dock-1" groupId="group-1" onClose={close} />,
    )
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /Robot 1/ }))
    expect(screen.getByRole('button', { name: /Robot 1/ })).toHaveClass('border-green-600!')
    await user.click(screen.getByRole('button', { name: /Robot 2/ }))
    expect(screen.getByRole('button', { name: /Robot 1/ })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: /Robot 2/ })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(mutate).toHaveBeenCalledWith({ map_id: 'map-1', docking_id: 'dock-1', robot_id: second })
    expect(close).toHaveBeenCalledOnce()
  })
  it('disables robots assigned elsewhere and handles empty lists', () => {
    const { rerender } = render(
      <AssignDockingRobotDialog
        map={{
          ...map,
          docking_stations: [
            ...map.docking_stations,
            { ...map.docking_stations[0], id: 'dock-2', robot_id: first },
          ],
        }}
        dockingId="dock-1"
        groupId="group-1"
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /Robot 1/ })).toBeDisabled()
    rerender(
      <AssignDockingRobotDialog
        map={{ ...map, robots: [] }}
        dockingId="dock-1"
        groupId="group-1"
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })
  it('blocks duplicate saves and dismissal while pending, retains selection after error', async () => {
    const user = userEvent.setup()
    const close = vi.fn()
    let reject!: (error: Error) => void
    mutate.mockImplementation(
      () =>
        new Promise((_, rejectPromise) => {
          reject = rejectPromise
        }),
    )
    render(
      <AssignDockingRobotDialog map={map} dockingId="dock-1" groupId="group-1" onClose={close} />,
    )
    await user.click(screen.getByRole('button', { name: /Robot 1/ }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await user.click(screen.getByRole('button', { name: 'Close' }))
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(close).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(mutate).toHaveBeenCalledOnce()
    reject(new Error('Unavailable'))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled())
    expect(screen.getByRole('button', { name: /Robot 1/ })).toHaveAttribute('aria-pressed', 'true')
  })
})
