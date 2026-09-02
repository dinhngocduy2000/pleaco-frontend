import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RobotModel } from '@/enum/robot'

const createRobot = vi.hoisted(() => vi.fn())
const mutationConfig = vi.hoisted(() => ({
  options: undefined as { onError?: (error: unknown) => void; onSuccess?: () => void } | undefined,
}))
const profile = vi.hoisted(() => ({
  data: undefined as { data: { group_id?: string } } | undefined,
}))
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }))

vi.mock('@/queries/use-auth-query', () => ({ useProfileQuery: () => profile }))
vi.mock('@/queries/use-tags-query', () => ({ useTagsQuery: () => ({ data: { data: [] } }) }))
vi.mock('@/queries/use-robots-query', () => ({
  useCreateRobotMutation: (options: typeof mutationConfig.options) => {
    mutationConfig.options = options
    return { mutateAsync: createRobot, isPending: false }
  },
}))
vi.mock('sonner', () => ({ toast }))
vi.mock('@/components/reusable/app-select-component/app-select-component', () => ({
  AppSelectComponent: ({ placeholder }: { placeholder: string }) => (
    <button type="button">{placeholder}</button>
  ),
}))
vi.mock('@/components/reusable/dialog-footer/dialog-footer', () => ({
  default: ({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) => (
    <div>
      <button onClick={onCancel} type="button">
        Cancel
      </button>
      <button onClick={onConfirm} type="button">
        Create robot
      </button>
    </div>
  ),
}))
vi.mock('@/routes/_authenticated/operations/components/robots/-robot-img-model', () => ({
  default: () => <div>Robot preview</div>,
}))
vi.mock('@/lib/translation', () => ({
  getTranslations: () => ({
    robot_create_title: () => 'Create robot',
    robot_create_description: () => 'Add a robot',
    robot_create_identity_section: () => 'Identity',
    robot_create_configuration_section: () => 'Configuration',
    robot_create_connectivity_section: () => 'Connectivity',
    robot_create_name_label: () => 'Name',
    robot_create_name_placeholder: () => 'Robot name',
    robot_create_serial_label: () => 'Serial number',
    robot_create_serial_placeholder: () => 'Serial number',
    robot_create_model_label: () => 'Model',
    robot_create_model_placeholder: () => 'Select model',
    robot_create_map_label: () => 'Map',
    robot_create_map_placeholder: () => 'Select map',
    robot_create_ip_label: () => 'IP address',
    robot_create_ip_placeholder: () => '192.168.1.10',
    robot_create_tags_label: () => 'Tags',
    robot_create_tags_placeholder: () => 'Select tags',
    robot_create_cancel: () => 'Cancel',
    robot_create_submit: () => 'Create robot',
    robot_create_success: () => 'Robot created',
    robot_create_error: () => 'Could not create robot',
    robot_create_no_active_group: () => 'No active group',
    validation_robot_name_required: () => 'Name required',
    validation_robot_name_max_length: () => 'Name too long',
    validation_robot_serial_required: () => 'Serial required',
    validation_robot_serial_max_length: () => 'Serial too long',
    validation_robot_model_required: () => 'Model required',
    validation_robot_ip_invalid: () => 'Invalid IP',
  }),
}))

import { CreateRobotDialog } from '@/routes/_authenticated/operations/components/robots/-create-robot-dialog'

describe('CreateRobotDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mutationConfig.options = undefined
    profile.data = undefined
  })

  it('prevents robot creation when the user has no active group', async () => {
    const user = userEvent.setup()
    render(<CreateRobotDialog setOpen={vi.fn()} />)
    await user.type(screen.getByPlaceholderText('Robot name'), 'Milo')
    await user.type(screen.getByPlaceholderText('Serial number'), 'PLC-001')
    await user.type(screen.getByPlaceholderText('192.168.1.10'), '192.168.1.10')
    await user.click(screen.getByRole('button', { name: 'Create robot' }))

    expect(createRobot).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('No active group')
  })

  it('creates a robot for the active group and closes after success', async () => {
    const user = userEvent.setup()
    const setOpen = vi.fn()
    profile.data = { data: { group_id: 'group-1' } }
    createRobot.mockImplementation(async () => mutationConfig.options?.onSuccess?.())
    render(<CreateRobotDialog setOpen={setOpen} />)
    await user.type(screen.getByPlaceholderText('Robot name'), ' Milo ')
    await user.type(screen.getByPlaceholderText('Serial number'), ' PLC-001 ')
    await user.type(screen.getByPlaceholderText('192.168.1.10'), '192.168.1.10')
    await user.click(screen.getByRole('button', { name: 'Create robot' }))

    await waitFor(() =>
      expect(createRobot).toHaveBeenCalledWith({
        group_id: 'group-1',
        name: 'Milo',
        serial_num: 'PLC-001',
        model: RobotModel.STANDARD,
        map_id: null,
        ip_address: '192.168.1.10',
        tags: [],
      }),
    )
    expect(setOpen).toHaveBeenCalledWith(false)
    expect(toast.success).toHaveBeenCalledWith('Robot created')
  })
})
