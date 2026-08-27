import { MAPS_ENDPOINTS } from '@/enum/endpoints'
import type { IResponseData } from '@/interface/api-response'
import type { ICreateMapRequest } from '@/interface/maps'
import axiosConfig from '.'

export const createMapApi = async (data: ICreateMapRequest): Promise<IResponseData<void>> => {
  return await axiosConfig.post(MAPS_ENDPOINTS.CREATE, data)
}
