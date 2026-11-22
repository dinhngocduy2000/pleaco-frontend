import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  assignDockingStationRobotApi,
  createMapApi,
  getMapDetailApi,
  getMapRobotPositionsApi,
  getMapsApi,
  saveMapLayoutApi,
  updateMapMetadataApi,
} from '@/api/maps'
import { MAPS_ENDPOINTS } from '@/enum/endpoints'
import type { IResponseData, IResponseDataWithPage } from '@/interface/api-response'
import type {
  IAssignDockingStationRobotRequest,
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

export const getMapRobotPositionsQueryKey = (mapId: string, groupId: string) => [
  ...getMapDetailQueryKey(mapId, groupId),
  'robot-positions',
]

export const useMapDetailQuery = (mapId: string, groupId?: string) => {
  return useQuery<IResponseData<IMapDetailInfo>>({
    queryKey: getMapDetailQueryKey(mapId, groupId),
    queryFn: ({ signal }) => getMapDetailApi(mapId, signal),
    enabled: Boolean(mapId),
  })
}

export const useAssignDockingStationRobotMutation = ({
  onSuccess,
  onError,
  onMutate,
}: IMutation<void, IAssignDockingStationRobotRequest> = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: assignDockingStationRobotApi,
    onSuccess: async (data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: getMapDetailQueryKey(variables.map_id, variables.group_id),
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: getMapRobotPositionsQueryKey(variables.map_id, variables.group_id),
          exact: true,
        }),
      ])
      onSuccess?.(data, variables)
    },
    onError: async (error, variables) => {
      if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        (error.response as { status?: number } | undefined)?.status === 409
      ) {
        await queryClient.invalidateQueries({
          queryKey: getMapDetailQueryKey(variables.map_id, variables.group_id),
          exact: true,
        })
      }
      onError?.(error)
    },
    onMutate,
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

let positionRevision = 0

// Order request starts and socket events independently of server/client clocks.
export const nextMapRobotPositionRevision = () => ++positionRevision

export const useMapRobotPositionsQuery = (mapId: string, groupId: string) =>
  useQuery({
    queryKey: getMapRobotPositionsQueryKey(mapId, groupId),
    queryFn: async ({ signal }) => {
      const requestRevision = nextMapRobotPositionRevision()
      const response = await getMapRobotPositionsApi(mapId, signal)
      return { ...response, requestRevision }
    },
    enabled: Boolean(mapId && groupId),
    retry: false,
  })
