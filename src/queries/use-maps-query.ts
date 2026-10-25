import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import {
  assignDockingRobotApi,
  createMapApi,
  getMapDetailApi,
  getMapsApi,
  saveMapLayoutApi,
  updateMapMetadataApi,
} from '@/api/maps'
import { MAPS_ENDPOINTS } from '@/enum/endpoints'
import type { IResponseData, IResponseDataWithPage } from '@/interface/api-response'
import type {
  ICreateMapRequest,
  IMapDetailInfo,
  IMapListInfo,
  IMapListRequest,
  ISaveMapLayoutRequest,
  IUpdateMapMetadataRequest,
} from '@/interface/maps'
import type { IMutation, ReactQueryHookParams } from '@/interface/utils'

export const getMapsQueryKey = (queryKey: unknown[] = []) => [MAPS_ENDPOINTS.LIST, ...queryKey]

export const useUpdateMapMetadataMutation = ({
  onSuccess,
  onError,
  onMutate,
}: IMutation<void, IUpdateMapMetadataRequest> = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateMapMetadataApi,
    onSuccess: async (data, variables) => {
      // List and detail keys both start with /maps, so this refreshes both.
      await queryClient.invalidateQueries({ queryKey: getMapsQueryKey() })
      onSuccess?.(data, variables)
    },
    onError,
    onMutate,
  })
}

export const getMapListQueryKey = (params: IMapListRequest, queryKey: unknown[] = []) => [
  MAPS_ENDPOINTS.LIST,
  params,
  ...queryKey,
]

export const getMapDetailQueryKey = (mapId: string, groupId?: string) => [
  MAPS_ENDPOINTS.DETAIL,
  mapId,
  groupId,
]

export const useMapDetailQuery = (mapId: string, groupId?: string) => {
  return useQuery<IResponseData<IMapDetailInfo>>({
    queryKey: getMapDetailQueryKey(mapId, groupId),
    queryFn: ({ signal }) => getMapDetailApi(mapId, signal),
    enabled: Boolean(mapId),
  })
}

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

export const useSaveMapLayoutMutation = ({
  onSuccess,
  onError,
  onMutate,
}: IMutation<void, ISaveMapLayoutRequest> = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: saveMapLayoutApi,
    onSuccess: async (data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getMapsQueryKey() }),
        queryClient.invalidateQueries({
          queryKey: [MAPS_ENDPOINTS.DETAIL, variables.map_id],
        }),
      ])
      onSuccess?.(data, variables)
    },
    onError,
    onMutate,
  })
}

export const useAssignDockingRobotMutation = (groupId: string) => {
  const queryClient = useQueryClient()
  const refresh = (mapId: string) =>
    queryClient.invalidateQueries({
      queryKey: getMapDetailQueryKey(mapId, groupId),
      exact: true,
    })
  return useMutation({
    mutationFn: assignDockingRobotApi,
    onSuccess: async (_, variables) => {
      await refresh(variables.map_id)
    },
    onError: async (error, variables) => {
      if (isAxiosError(error) && error.response?.status === 409) await refresh(variables.map_id)
    },
  })
}
