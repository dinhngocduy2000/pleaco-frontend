import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createRobotApi, deleteRobotApi, getRobotsApi } from '@/api/robots'
import { BOTS_ENDPOINTS } from '@/enum/endpoints'
import type { IResponseData, IResponseDataWithPage } from '@/interface/api-response'
import type { ICreateRobotRequest, IRobotInfo, IRobotListRequest } from '@/interface/robots'
import type { IMutation, ReactQueryHookParams } from '@/interface/utils'

export const getRobotsQueryKey = (params: IRobotListRequest, queryKey: unknown[] = []) => [
  BOTS_ENDPOINTS.LIST,
  params,
  ...queryKey,
]

export const useRobotsQuery = ({
  params,
  queryKey = [],
  enabled = true,
}: ReactQueryHookParams<IRobotListRequest>) => {
  return useQuery<IResponseDataWithPage<IRobotInfo>>({
    queryKey: getRobotsQueryKey(params, queryKey),
    queryFn: ({ signal }) => getRobotsApi(params, signal),
    enabled,
  })
}

export const useCreateRobotMutation = ({
  onSuccess,
  onError,
  onMutate,
}: IMutation<IResponseData<void>, ICreateRobotRequest> = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createRobotApi,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [BOTS_ENDPOINTS.LIST] })
      onSuccess?.(data, variables)
    },
    onError,
    onMutate,
  })
}

export const useDeleteRobotMutation = ({
  onSuccess,
  onError,
  onMutate,
}: IMutation<IResponseData<void>, string> = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteRobotApi,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [BOTS_ENDPOINTS.LIST] })
      onSuccess?.(data, variables)
    },
    onError,
    onMutate,
  })
}
