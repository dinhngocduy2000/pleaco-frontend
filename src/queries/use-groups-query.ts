// @refresh reset

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createGroupApi, getListGroupKeyValue } from '@/api/groups'
import { GROUPS_ENDPOINTS } from '@/enum/endpoints'
import type { IResponseData } from '@/interface/api-response'
import type { ICreateGroupRequest, IGroupInfo } from '@/interface/groups'
import type { IMutation, ReactQueryHookParams } from '@/interface/utils'
import { GET_PROFILE_QUERY_KEY } from './auth-query-keys'

const getListGroupKeyValueQueryKey = (params: unknown, queryKey: unknown[]) => {
  return [GROUPS_ENDPOINTS.LIST_KEY_VALUE, GROUPS_ENDPOINTS.LIST_GROUP, params, ...queryKey]
}

export const useCreateGroupMutation = ({
  onSuccess,
  onError,
  onMutate,
}: IMutation<IResponseData<IGroupInfo>, ICreateGroupRequest> = {}) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: ICreateGroupRequest) => {
      return await createGroupApi(data)
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: GET_PROFILE_QUERY_KEY })
      onSuccess?.(data, variables)
    },
    onError,
    onMutate,
  })
}

export const useListGroupKeyValueQuery = ({
  params,
  queryKey = [],
  enabled = true,
}: ReactQueryHookParams<null>) => {
  return useQuery({
    queryKey: getListGroupKeyValueQueryKey(params, queryKey),
    queryFn: async ({ signal }) => {
      const res = await getListGroupKeyValue({ signal })
      return res
    },
    enabled,
  })
}

// export const useChangeActiveGroupMutation = ({
//   onSuccess,
//   onError,
//   onMutate,
// }: IMutation<IResponseData<void>, SwitchGroupRequest>) => {
//   const queryClient = useQueryClient()
//   const toastID = useRef<string | number>(undefined)
//   return useMutation({
//     mutationFn: async (data: SwitchGroupRequest) => {
//       const res = await getGroups().switchCurrentUserGroupApiV1GroupsSwitchPut(data)
//       return res
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: GET_PROFILE_QUERY_KEY })
//       toast.success('Active group changed successfully', { id: toastID.current })
//       onSuccess?.()
//     },
//     onError: (error) => {
//       const errorMessage = getErrorMessage(error as IAxiosError)
//       toast.error(errorMessage, { id: toastID.current })
//       onError?.(error)
//     },
//     onMutate: () => {
//       toastID.current = toast.loading('Changing active group...')
//       onMutate?.()
//     },
//   })
// }
