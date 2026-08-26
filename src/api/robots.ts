import { BOTS_ENDPOINTS } from '@/enum/endpoints'
import type { IResponseData, IResponseDataWithPage } from '@/interface/api-response'
import type { ICreateRobotRequest, IRobotInfo, IRobotListRequest } from '@/interface/robots'
import { paramsSerializer } from '@/lib/utils'
import axiosConfig from '.'

export const createRobotApi = async (data: ICreateRobotRequest): Promise<IResponseData<void>> => {
  return await axiosConfig.post(BOTS_ENDPOINTS.CREATE, data)
}

export const deleteRobotApi = async (id: string): Promise<IResponseData<void>> => {
  return await axiosConfig.delete(`${BOTS_ENDPOINTS.DELETE}/${id}`)
}

export const getRobotsApi = async (
  params: IRobotListRequest,
  signal?: AbortSignal,
): Promise<IResponseDataWithPage<IRobotInfo>> => {
  return await axiosConfig.get(BOTS_ENDPOINTS.LIST, { params, signal, paramsSerializer })
}
