import { TAGS_ENDPOINTS } from '@/enum/endpoints'
import type { IResponseData } from '@/interface/api-response'
import type { ITagInfo } from '@/interface/tags'
import axiosConfig from '.'

export const getTagsApi = async (
  params: { group_id: string },
  signal?: AbortSignal,
): Promise<IResponseData<ITagInfo[]>> => {
  return await axiosConfig.get(TAGS_ENDPOINTS.LIST, { signal, params })
}
