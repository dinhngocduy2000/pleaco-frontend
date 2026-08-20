import type { QueryClient } from '@tanstack/react-query'
import { GROUPS_ENDPOINTS } from '@/enum/endpoints'

type RefreshGroupMembersListParams = {
  page: number
  queryClient: QueryClient
  resetPage: VoidFunction
}

export const refreshGroupMembersList = ({
  page,
  queryClient,
  resetPage,
}: RefreshGroupMembersListParams) => {
  if (page === 1) {
    queryClient.invalidateQueries({ queryKey: [GROUPS_ENDPOINTS.LIST_MEMBERS] })
    return
  }

  queryClient.invalidateQueries({
    queryKey: [GROUPS_ENDPOINTS.LIST_MEMBERS],
    refetchType: 'none',
  })
  resetPage()
}
