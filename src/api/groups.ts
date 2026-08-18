import { GROUPS_ENDPOINTS } from '@/enum/endpoints'
import type { IResponseData, IResponseDataWithPage } from '@/interface/api-response'
import type {
  ICreateGroupRequest,
  IGroupInfo,
  IGroupMemberListInfo,
  IGroupMemberListRequest,
  IInviteGroupMemberRequest,
  ISwitchGroupRequest,
} from '@/interface/groups'
import type { IOption } from '@/interface/utils'
import axiosConfig from '.'

export const createGroupApi = async (
  data: ICreateGroupRequest,
): Promise<IResponseData<IGroupInfo>> => {
  return await axiosConfig.post(GROUPS_ENDPOINTS.CREATE, data)
}

export const getListGroupKeyValue = async ({
  signal,
}: {
  signal?: AbortSignal
}): Promise<IResponseData<IOption[]>> => {
  return await axiosConfig.get(GROUPS_ENDPOINTS.LIST_KEY_VALUE, { signal })
}

export const getGroupMembersApi = async (
  params: IGroupMemberListRequest,
  signal?: AbortSignal,
): Promise<IResponseDataWithPage<IGroupMemberListInfo>> => {
  return await axiosConfig.get(GROUPS_ENDPOINTS.LIST_MEMBERS, { params, signal })
}

export const inviteGroupMembersApi = async (
  groupId: string,
  members: IInviteGroupMemberRequest[],
): Promise<IResponseData<void>> => {
  return await axiosConfig.post(`${GROUPS_ENDPOINTS.LIST_GROUP}/${groupId}/members`, members)
}

export const changeActiveGroupAPI = async (
  data: ISwitchGroupRequest,
  signal?: AbortSignal,
): Promise<IResponseData<void>> => {
  return await axiosConfig.put(GROUPS_ENDPOINTS.CHANGE_ACTIVE_GROUP, data, { signal })
}
