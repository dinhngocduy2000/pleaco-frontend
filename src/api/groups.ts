import { GROUPS_ENDPOINTS } from '@/enum/endpoints'
import type { IResponseData } from '@/interface/api-response'
import type { ICreateGroupRequest, IGroupInfo } from '@/interface/groups'
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

export const changeActiveGroupAPI = async (
  data: { group_id: string },
  signal?: AbortSignal,
): Promise<IResponseData<void>> => {
  return await axiosConfig.put(GROUPS_ENDPOINTS.CHANGE_ACTIVE_GROUP, data, { signal })
}
