import { AUTH_ENDPOINTS } from '@/enum/endpoints'
import type { IResponseData } from '@/interface/api-response'
import type {
  GetSsoAuthUrlParams,
  ILoginRequest,
  IRegisterRequest,
  IUserProfileDetail,
  IValidateOTPRequest,
} from '@/interface/auth'
import axiosConfig, { axiosConfigWithoutAuth } from '.'

export const loginApi = async (data: ILoginRequest): Promise<string> => {
  return await axiosConfigWithoutAuth.post(AUTH_ENDPOINTS.LOGIN, data)
}

export const registerApi = async (data: IRegisterRequest): Promise<IResponseData<null>> => {
  return await axiosConfigWithoutAuth.post(AUTH_ENDPOINTS.REGISTER, data)
}

export const trackSession = async (signal?: AbortSignal): Promise<IResponseData<null>> => {
  return await axiosConfig.get(AUTH_ENDPOINTS.TRACK_SESSION, { signal })
}

export const getProfileApi = async (
  signal?: AbortSignal,
): Promise<IResponseData<IUserProfileDetail>> => {
  return await axiosConfig.get(AUTH_ENDPOINTS.PROFILE, { signal })
}

export const refreshTokenAPI = async (data: {
  is_save_session: boolean
}): Promise<IResponseData<unknown>> => {
  return await axiosConfigWithoutAuth.post(AUTH_ENDPOINTS.REFRESH_TOKEN, data)
}

export const logoutAPI = async (): Promise<IResponseData<null>> => {
  return await axiosConfig.post(AUTH_ENDPOINTS.LOGOUT)
}

export const getSSOLoginURLAPI = async (
  params: GetSsoAuthUrlParams,
): Promise<IResponseData<{ url: string }>> => {
  return await axiosConfigWithoutAuth.post(AUTH_ENDPOINTS.SSO_LOGIN_URL, params)
}

export const validateOTPAPI = async (
  data: IValidateOTPRequest,
): Promise<IResponseData<unknown>> => {
  return await axiosConfigWithoutAuth.post(AUTH_ENDPOINTS.VALIDATE_OTP, data)
}
