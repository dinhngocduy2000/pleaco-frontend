import { useQuery } from '@tanstack/react-query'
import { getTagsApi } from '@/api/tags'
import { TAGS_ENDPOINTS } from '@/enum/endpoints'
import type { IResponseData } from '@/interface/api-response'
import type { ITagInfo } from '@/interface/tags'
import { useProfileQuery } from './use-auth-query'

export const useTagsQuery = () => {
  const { data: userProfileResponse } = useProfileQuery()
  const groupID = userProfileResponse?.data.group_id
  return useQuery<IResponseData<ITagInfo[]>>({
    queryKey: [TAGS_ENDPOINTS.LIST],
    queryFn: ({ signal }) => getTagsApi({ group_id: groupID ?? '' }, signal),
    enabled: !!groupID,
  })
}
