import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ROBOT_CONNECTION_STATUS, ROBOT_OPERATION_STATUS, RobotModel } from '@/enum/robot'
import type { IRobotInfo } from '@/interface/robots'

const deleteRobot = vi.hoisted(() => vi.fn())
const toastError = vi.hoisted(() => vi.fn())
const toastSuccess = vi.hoisted(() => vi.fn())
const useDeleteRobotMutation = vi.hoisted(() => vi.fn())

vi.mock('sonner', () => ({ toast: { error: toastError, success: toastSuccess } }))
vi.mock('@/queries/use-robots-query', () => ({ useDeleteRobotMutation }))

import BotActionsDropdown from '@/routes/_authenticated/operations/components/robots/-bot-actions-dropdown'

const robot: IRobotInfo = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Milo',
  serial_num: 'PLC-L-0012',
  model: RobotModel.LITE,
  ip_address: '192.168.10.21',
  operational_status: ROBOT_OPERATION_STATUS.IDLE,
  connection_status: ROBOT_CONNECTION_STATUS.ONLINE,
  created_at: '2026-08-23T00:00:00.000Z',
}

type MutationCallbacks = {
  onError?: (error: unknown) => void
  onSuccess?: () => void
}

describe('BotActionsDropdown', () => {
  let mutationCallbacks: MutationCallbacks

  beforeEach(() => {
    deleteRobot.mockReset()
    toastError.mockReset()
    toastSuccess.mockReset()
    mutationCallbacks = {}
    useDeleteRobotMutation.mockImplementation((callbacks: MutationCallbacks) => {
      mutationCallbacks = callbacks
      return { mutateAsync: deleteRobot, isPending: false }
    })
  })

  it('deletes the selected robot, closes the dialog, and shows a success toast', async () => {
    const user = userEvent.setup()
    render(<BotActionsDropdown robot={robot} />)

    await user.click(screen.getByRole('button', { name: 'Robot options: Milo' }))
    await user.click(screen.getByText('Delete'))
    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(deleteRobot).toHaveBeenCalledWith(robot.id)

    act(() => {
      mutationCallbacks.onSuccess?.()
    })

    expect(toastSuccess).toHaveBeenCalledWith('Robot Milo was deleted successfully.')
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })
  })

  it('shows the API error and keeps the dialog open', async () => {
    const user = userEvent.setup()
    render(<BotActionsDropdown robot={robot} />)

    await user.click(screen.getByRole('button', { name: 'Robot options: Milo' }))
    await user.click(screen.getByText('Delete'))

    mutationCallbacks.onError?.({ response: { data: { detail: 'Robot is currently assigned' } } })

    expect(toastError).toHaveBeenCalledWith('Robot is currently assigned')
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })
})
