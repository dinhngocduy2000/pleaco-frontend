import { BOTS_ENDPOINTS } from '@/enum/endpoints'
import type { IResponseData } from '@/interface/api-response'
import type { ICreateRobotRequest } from '@/interface/robots'
import axiosConfig from '.'

export const createRobotApi = async (data: ICreateRobotRequest): Promise<IResponseData<void>> => {
  return await axiosConfig.post(BOTS_ENDPOINTS.CREATE, data)
}
