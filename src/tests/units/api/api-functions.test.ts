import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AUTH_ENDPOINTS,
  BOTS_ENDPOINTS,
  GROUPS_ENDPOINTS,
  MAPS_ENDPOINTS,
  TAGS_ENDPOINTS,
} from '@/enum/endpoints'

const authenticatedClient = vi.hoisted(() => ({
  delete: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
}))
const publicClient = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))

vi.mock('@/api', () => ({ default: authenticatedClient, axiosConfigWithoutAuth: publicClient }))

import {
  getProfileApi,
  getSSOLoginURLAPI,
  loginApi,
  logoutAPI,
  refreshTokenAPI,
  registerApi,
  trackSession,
  validateOTPAPI,
} from '@/api/auth'
import {
  acceptGroupInvitationAPI,
  changeActiveGroupAPI,
  createGroupApi,
  deleteGroupMemberAPI,
  getGroupInvitationAPI,
  getGroupMembersApi,
  getListGroupKeyValue,
  inviteGroupMembersApi,
  updateGroupMemberAPI,
} from '@/api/groups'
import { createMapApi, getMapsApi } from '@/api/maps'
import { createRobotApi, deleteRobotApi, getRobotsApi, getRobotsKeyValueApi } from '@/api/robots'
import { getTagsApi } from '@/api/tags'

describe('API functions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses the correct auth client, endpoint, payload, and cancellation signal', async () => {
    const signal = new AbortController().signal
    await loginApi({ email: 'operator@example.com', password: 'secret', is_save_session: true })
    await registerApi({ name: 'Operator', email: 'operator@example.com', password: 'secret' })
    await trackSession(signal)
    await getProfileApi(signal)
    await refreshTokenAPI({ is_save_session: true })
    await logoutAPI()
    await getSSOLoginURLAPI({ provider: 'google' as never })
    await validateOTPAPI({ email: 'operator@example.com', otp: '123456' })

    expect(publicClient.post).toHaveBeenCalledWith(AUTH_ENDPOINTS.LOGIN, expect.any(Object))
    expect(publicClient.post).toHaveBeenCalledWith(AUTH_ENDPOINTS.REGISTER, expect.any(Object))
    expect(authenticatedClient.get).toHaveBeenCalledWith(AUTH_ENDPOINTS.TRACK_SESSION, { signal })
    expect(authenticatedClient.get).toHaveBeenCalledWith(AUTH_ENDPOINTS.PROFILE, { signal })
    expect(publicClient.post).toHaveBeenCalledWith(AUTH_ENDPOINTS.REFRESH_TOKEN, {
      is_save_session: true,
    })
    expect(authenticatedClient.post).toHaveBeenCalledWith(AUTH_ENDPOINTS.LOGOUT)
    expect(publicClient.get).toHaveBeenCalledWith(AUTH_ENDPOINTS.SSO_LOGIN_URL, {
      params: { provider: 'google' },
    })
    expect(publicClient.post).toHaveBeenCalledWith(AUTH_ENDPOINTS.VALIDATE_OTP, expect.any(Object))
  })

  it('forwards map, robot, tag, and group requests to their endpoint contracts', async () => {
    const signal = new AbortController().signal
    await createMapApi({} as never)
    await getMapsApi({ page: 1, page_size: 10 } as never, signal)
    await createRobotApi({} as never)
    await deleteRobotApi('robot-1')
    await getRobotsApi({ group_id: 'group-1', page: 1, page_size: 10 }, signal)
    await getRobotsKeyValueApi(signal)
    await getTagsApi({ group_id: 'group-1' }, signal)
    await createGroupApi({ name: 'Operations' })
    await getListGroupKeyValue({ signal })
    await getGroupMembersApi({ group_id: 'group-1', page: 1, page_size: 10 }, signal)
    await inviteGroupMembersApi('group-1', [])
    await changeActiveGroupAPI({ group_id: 'group-1' }, signal)
    await getGroupInvitationAPI('invite-1', signal)
    await acceptGroupInvitationAPI('invite-1')
    await deleteGroupMemberAPI({ group_id: 'group-1', member_id: 'member-1' })
    await updateGroupMemberAPI({
      group_id: 'group-1',
      member_id: 'member-1',
      role: 'ADMIN',
    } as never)

    expect(authenticatedClient.post).toHaveBeenCalledWith(MAPS_ENDPOINTS.CREATE, {})
    expect(authenticatedClient.get).toHaveBeenCalledWith(
      MAPS_ENDPOINTS.LIST,
      expect.objectContaining({ signal }),
    )
    expect(authenticatedClient.post).toHaveBeenCalledWith(BOTS_ENDPOINTS.CREATE, {})
    expect(authenticatedClient.delete).toHaveBeenCalledWith(`${BOTS_ENDPOINTS.DELETE}/robot-1`)
    expect(authenticatedClient.get).toHaveBeenCalledWith(BOTS_ENDPOINTS.LIST_KEY_VALUE, { signal })
    expect(authenticatedClient.get).toHaveBeenCalledWith(TAGS_ENDPOINTS.LIST, {
      signal,
      params: { group_id: 'group-1' },
    })
    expect(authenticatedClient.get).toHaveBeenCalledWith(GROUPS_ENDPOINTS.LIST_KEY_VALUE, {
      signal,
    })
    expect(authenticatedClient.post).toHaveBeenCalledWith(
      `${GROUPS_ENDPOINTS.LIST_GROUP}/group-1/members`,
      [],
    )
    expect(authenticatedClient.put).toHaveBeenCalledWith(
      GROUPS_ENDPOINTS.CHANGE_ACTIVE_GROUP,
      { group_id: 'group-1' },
      { signal },
    )
    expect(authenticatedClient.delete).toHaveBeenCalledWith(
      `${GROUPS_ENDPOINTS.LIST_GROUP}/group-1/members/member-1`,
    )
  })
})
