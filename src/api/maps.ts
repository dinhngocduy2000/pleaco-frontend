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
import { paramsSerializer } from '@/lib/utils'
import axiosConfig from '.'

export const assignDockingStationRobotApi = async ({
  map_id,
  docking_id,
  robot_id,
}: IAssignDockingStationRobotRequest): Promise<void> => {
  await axiosConfig.put(
    `${MAPS_ENDPOINTS.ASSIGN_DOCKING_STATION_ROBOT}/${map_id}/docking/${docking_id}/`,
    { robot_id },
  )
}

export const updateMapMetadataApi = async ({
  map_id,
  ...metadata
}: IUpdateMapMetadataRequest): Promise<void> => {
  await axiosConfig.put(`${MAPS_ENDPOINTS.UPDATE_METADATA}/${map_id}`, metadata)
}

export const createMapApi = async (
  data: ICreateMapRequest,
): Promise<IResponseData<IMapListInfo>> => {
  return await axiosConfig.post(MAPS_ENDPOINTS.CREATE, data)
}

export const saveMapLayoutApi = async (data: ISaveMapLayoutRequest): Promise<void> => {
  await axiosConfig.post(MAPS_ENDPOINTS.SAVE_LAYOUT, data)
}

export const getMapsApi = async (
  params: IMapListRequest,
  signal?: AbortSignal,
): Promise<IResponseDataWithPage<IMapListInfo>> => {
  return await axiosConfig.get(MAPS_ENDPOINTS.LIST, { params, signal, paramsSerializer })
}

export const getMapDetailApi = async (
  mapId: string,
  signal?: AbortSignal,
): Promise<IResponseData<IMapDetailInfo>> => {
  return await axiosConfig.get(`${MAPS_ENDPOINTS.DETAIL}/${mapId}`, { signal })
}
