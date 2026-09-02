import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GROUPS_ENDPOINTS } from '@/enum/endpoints'
import { GroupMemberOrderBy, GroupMemberOrderDirection } from '@/enum/group'
import { KEY_STORAGE } from '@/enum/key-storage'
import { GET_PROFILE_QUERY_KEY } from '@/queries/use-auth-query'

const api = vi.hoisted(() => ({
  acceptGroupInvitationAPI: vi.fn(),
  changeActiveGroupAPI: vi.fn(),
  createGroupApi: vi.fn(),
  deleteGroupMemberAPI: vi.fn(),
  getGroupInvitationAPI: vi.fn(),
  getGroupMembersApi: vi.fn(),
  getListGroupKeyValue: vi.fn(),
  inviteGroupMembersApi: vi.fn(),
  updateGroupMemberAPI: vi.fn(),
}))
const toast = vi.hoisted(() => ({
  error: vi.fn(),
  loading: vi.fn(() => 'toast-id'),
  success: vi.fn(),
}))

vi.mock('@/api/groups', () => api)
vi.mock('sonner', () => ({ toast }))
vi.mock('@/lib/translation', () => ({
  getTranslations: () => ({ group_invite_member_error: () => 'Invite failed' }),
}))
vi.mock('@/lib/utils', () => ({
  getErrorMessage: (error: { message?: string }) => error.message ?? '',
}))

import {
  useAcceptGroupInvitationMutation,
  useChangeActiveGroupMutation,
  useCreateGroupMutation,
  useGetGroupInvitationQuery,
  useGroupMembersQuery,
  useListGroupKeyValueQuery,
} from '@/queries/use-groups-query'

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, wrapper }
}

describe('group query hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('fetches group options, members, and a stored invitation with cancellation signals', async () => {
    const memberParams = {
      group_id: 'group-1',
      page: 1,
      page_size: 10,
      order_by: GroupMemberOrderBy.JOINED_DATE,
      order_direction: GroupMemberOrderDirection.ASC,
    }
    api.getListGroupKeyValue.mockResolvedValue({ data: [] })
    api.getGroupMembersApi.mockResolvedValue({ data: { items: [], total: 0 } })
    api.getGroupInvitationAPI.mockResolvedValue({ data: { invitation_id: 'invite-1' } })
    localStorage.setItem(KEY_STORAGE.INVITATION_ID, 'invite-1')
    const { wrapper } = createWrapper()
    const groupOptions = renderHook(
      () => useListGroupKeyValueQuery({ params: null, queryKey: ['dialog'] }),
      { wrapper },
    )
    const members = renderHook(() => useGroupMembersQuery({ params: memberParams }), { wrapper })
    const invitation = renderHook(useGetGroupInvitationQuery, { wrapper })

    await waitFor(() =>
      expect(
        groupOptions.result.current.isSuccess &&
          members.result.current.isSuccess &&
          invitation.result.current.isSuccess,
      ).toBe(true),
    )
    expect(api.getListGroupKeyValue).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) })
    expect(api.getGroupMembersApi).toHaveBeenCalledWith(memberParams, expect.any(AbortSignal))
    expect(api.getGroupInvitationAPI).toHaveBeenCalledWith('invite-1', expect.any(AbortSignal))
  })

  it('invalidates the profile after creating a group or changing the active group', async () => {
    api.createGroupApi.mockResolvedValue({ data: { id: 'group-1' } })
    api.changeActiveGroupAPI.mockResolvedValue({ data: undefined })
    const { client, wrapper } = createWrapper()
    const invalidateQueries = vi.spyOn(client, 'invalidateQueries')
    const create = renderHook(() => useCreateGroupMutation(), { wrapper })
    const change = renderHook(() => useChangeActiveGroupMutation({}), { wrapper })

    await act(async () => {
      await create.result.current.mutateAsync({ name: 'Operations' })
      await change.result.current.mutateAsync({ group_id: 'group-1' })
    })

    expect(api.createGroupApi).toHaveBeenCalledWith({ name: 'Operations' })
    expect(api.changeActiveGroupAPI).toHaveBeenCalledWith({ group_id: 'group-1' })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: GET_PROFILE_QUERY_KEY })
    expect(toast.loading).toHaveBeenCalledWith('Changing active group...')
    expect(toast.success).toHaveBeenCalledWith('Active group changed successfully', {
      id: 'toast-id',
    })
  })

  it('accepts the stored invitation, refreshes dependent data, and clears storage', async () => {
    localStorage.setItem(KEY_STORAGE.INVITATION_ID, 'invite-1')
    api.acceptGroupInvitationAPI.mockResolvedValue(undefined)
    const onSuccess = vi.fn()
    const { client, wrapper } = createWrapper()
    const invalidateQueries = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useAcceptGroupInvitationMutation({ onSuccess }), {
      wrapper,
    })

    await act(async () => {
      await result.current.mutateAsync('ignored-by-hook')
    })

    expect(api.acceptGroupInvitationAPI).toHaveBeenCalledWith('invite-1')
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: GET_PROFILE_QUERY_KEY })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: [GROUPS_ENDPOINTS.LIST_KEY_VALUE, GROUPS_ENDPOINTS.LIST_GROUP],
    })
    expect(localStorage.getItem(KEY_STORAGE.INVITATION_ID)).toBeNull()
    expect(onSuccess).toHaveBeenCalledOnce()
  })
})
