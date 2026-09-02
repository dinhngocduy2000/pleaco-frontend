import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mutation = vi.hoisted(() => vi.fn())
const mutationConfig = vi.hoisted(() => ({
  options: undefined as { onError?: (error: unknown) => void; onSuccess?: () => void } | undefined,
}))
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }))

vi.mock('@/queries/use-groups-query', () => ({
  useCreateGroupMutation: (options: typeof mutationConfig.options) => {
    mutationConfig.options = options
    return { mutateAsync: mutation, isPending: false }
  },
}))
vi.mock('sonner', () => ({ toast }))
vi.mock('@/lib/translation', () => ({
  getTranslations: () => ({
    create_group_welcome_title: () => 'Create your group',
    create_group_welcome_description: () => 'Start collaborating.',
    create_group_success: () => 'Group created',
    create_group_error: () => 'Could not create group',
    validation_group_name_required: () => 'Name required',
    validation_group_name_max_length: () => 'Name too long',
    validation_group_description_max_length: () => 'Description too long',
  }),
}))

import CreateGroupForm, {
  type CreateGroupFormHandle,
} from '@/components/layouts/site_header/create-group-dialog/create-group-dialog'

describe('CreateGroupForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mutationConfig.options = undefined
  })

  it('renders group fields and submits the trimmed form through its imperative handle', async () => {
    const user = userEvent.setup()
    const ref = createRef<CreateGroupFormHandle>()
    render(<CreateGroupForm closeModal={vi.fn()} ref={ref} />)

    expect(screen.getByText('Create your group')).toBeInTheDocument()
    await user.type(screen.getByPlaceholderText('Enter group name'), ' Operations ')
    await user.type(
      screen.getByPlaceholderText('Enter group description (optional)'),
      ' Core team ',
    )
    await act(async () => {
      ref.current?.submit()
    })

    await waitFor(() =>
      expect(mutation).toHaveBeenCalledWith({ name: 'Operations', description: 'Core team' }),
    )
  })
})
