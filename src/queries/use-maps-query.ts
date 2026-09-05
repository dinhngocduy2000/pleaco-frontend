import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createMapApi, getMapsApi } from '@/api/maps'
import { MAPS_ENDPOINTS } from '@/enum/endpoints'
import type { IResponseData, IResponseDataWithPage } from '@/interface/api-response'
import type { ICreateMapRequest, IMapListInfo, IMapListRequest } from '@/interface/maps'
import type { IMutation, ReactQueryHookParams } from '@/interface/utils'

export const getMapsQueryKey = (queryKey: unknown[] = []) => [MAPS_ENDPOINTS.LIST, ...queryKey]

export const getMapListQueryKey = (params: IMapListRequest, queryKey: unknown[] = []) => [
  MAPS_ENDPOINTS.LIST,
  params,
  ...queryKey,
]

export const useMapsQuery = ({
  params,
  queryKey = [],
  enabled = true,
}: ReactQueryHookParams<IMapListRequest>) => {
  return useQuery<IResponseDataWithPage<IMapListInfo>>({
    queryKey: getMapListQueryKey(params, queryKey),
    queryFn: ({ signal }) => getMapsApi(params, signal),
    enabled,
  })
}

export const useCreateMapMutation = ({
  onSuccess,
  onError,
  onMutate,
}: IMutation<IResponseData<IMapListInfo>, ICreateMapRequest> = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createMapApi,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: getMapsQueryKey() })
      onSuccess?.(data, variables)
    },
    onError,
    onMutate,
  })
}
