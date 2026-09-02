import { act, renderHook, waitFor } from '@testing-library/react'
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
    create_group_success: () => 'Group created',
    create_group_error: () => 'Could not create group',
    validation_group_name_required: () => 'Name required',
    validation_group_name_max_length: () => 'Name too long',
    validation_group_description_max_length: () => 'Description too long',
  }),
}))

import { useCreateGroupForm } from '@/components/layouts/site_header/create-group-dialog/use-create-group-form'

describe('useCreateGroupForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mutationConfig.options = undefined
  })

  it('normalizes an empty description to null before creating a group', () => {
    const { result } = renderHook(() => useCreateGroupForm({ closeModal: vi.fn() }))

    act(() => {
      result.current.onSubmit({ name: 'Operations', description: '' })
    })

    expect(mutation).toHaveBeenCalledWith({ name: 'Operations', description: null })
  })

  it('resets, notifies, and closes after success while surfacing a safe server message on failure', async () => {
    const closeModal = vi.fn()
    mutation.mockImplementation(() => mutationConfig.options?.onSuccess?.())
    const { result } = renderHook(() => useCreateGroupForm({ closeModal }))

    act(() => {
      result.current.onSubmit({ name: 'Operations', description: 'Team' })
    })
    expect(toast.success).toHaveBeenCalledWith('Group created')
    expect(closeModal).toHaveBeenCalledOnce()

    act(() => {
      mutationConfig.options?.onError?.({
        response: { data: { detail: 'Group name already exists' } },
      })
    })
    expect(toast.error).toHaveBeenCalledWith('Group name already exists')

    await waitFor(() =>
      expect(result.current.form.getValues()).toEqual({ name: '', description: '' }),
    )
  })
})
