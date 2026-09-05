import { MAPS_ENDPOINTS } from '@/enum/endpoints'
import type { IResponseData, IResponseDataWithPage } from '@/interface/api-response'
import type {
  ICreateMapRequest,
  IMapListInfo,
  IMapListRequest,
  ISaveMapBoundaries,
} from '@/interface/maps'
import { paramsSerializer } from '@/lib/utils'
import axiosConfig from '.'

export const createMapApi = async (
  data: ICreateMapRequest,
): Promise<IResponseData<IMapListInfo>> => {
  return await axiosConfig.post(MAPS_ENDPOINTS.CREATE, data)
}

export const saveMapBoundariesApi = async (data: ISaveMapBoundaries): Promise<void> => {
  await axiosConfig.post(MAPS_ENDPOINTS.SAVE_BOUNDARY, data)
}

export const getMapsApi = async (
  params: IMapListRequest,
  signal?: AbortSignal,
): Promise<IResponseDataWithPage<IMapListInfo>> => {
  return await axiosConfig.get(MAPS_ENDPOINTS.LIST, { params, signal, paramsSerializer })
}
