import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  getProfileApi,
  getSSOLoginURLAPI,
  loginApi,
  logoutAPI,
  registerApi,
  trackSession,
  validateOTPAPI,
} from '@/api/auth'
import { KEY_STORAGE } from '@/enum/key-storage'
import { ROUTES } from '@/enum/routes'
import type { IResponseData } from '@/interface/api-response'
import type {
  GetSsoAuthUrlParams,
  ILoginRequest,
  IRegisterRequest,
  IValidateOTPRequest,
  SSOAuthUrlResponse,
} from '@/interface/auth'
import type { IMutation } from '@/interface/utils'
import { GET_PROFILE_QUERY_KEY, GET_TRACK_SESSION_QUERY_KEY } from './auth-query-keys'

export { GET_PROFILE_QUERY_KEY, GET_TRACK_SESSION_QUERY_KEY } from './auth-query-keys'

export const useLoginMutation = ({
  onSuccess,
  onError,
  onMutate,
}: IMutation<string, ILoginRequest>) => {
  return useMutation({
    mutationFn: (data: ILoginRequest) => loginApi(data),
    onSuccess: (_, variables) => {
      localStorage.setItem(KEY_STORAGE.IS_LOGGED_IN, 'true')
      if (variables.is_save_session) {
        localStorage.setItem(KEY_STORAGE.IS_SAVE_SESSION, 'true')
      }
      onSuccess?.()
    },
    onError,
    onMutate,
  })
}

export const useRegisterMutation = ({
  onSuccess,
  onError,
  onMutate,
}: IMutation<unknown, IRegisterRequest> = {}) => {
  return useMutation({
    mutationFn: (data: IRegisterRequest) => registerApi(data),
    onSuccess,
    onError,
    onMutate,
  })
}

export const useTrackSessionQuery = () => {
  return useQuery({
    queryKey: GET_TRACK_SESSION_QUERY_KEY,
    queryFn: ({ signal }) => trackSession(signal),
    refetchInterval: () => 1000 * 60 * 10, // 10 min; stop when failed
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
    retry: (num) => {
      if (num > 2) {
        return false
      }
      return true
    },
  })
}

export const useProfileQuery = () => {
  return useQuery({
    queryKey: GET_PROFILE_QUERY_KEY,
    queryFn: async ({ signal }) => {
      const res = await getProfileApi(signal)
      return res
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
    retry: (num) => {
      if (num > 2) {
        return false
      }
      return true
    },
  })
}

export const useLogoutMutation = ({
  onSuccess,
  onError,
  onMutate,
}: IMutation<unknown, void> = {}) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: logoutAPI,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: GET_PROFILE_QUERY_KEY })
      localStorage.removeItem(KEY_STORAGE.IS_LOGGED_IN)
      localStorage.removeItem(KEY_STORAGE.INVITATION_ID)
      localStorage.removeItem(KEY_STORAGE.IS_SAVE_SESSION)
      navigate({ to: ROUTES.LOGIN as string })
      onSuccess?.()
    },
    onError,
    onMutate,
  })
}

export const useGetGoogleLoginURL = ({
  onSuccess,
  onError,
  onMutate,
}: IMutation<IResponseData<SSOAuthUrlResponse>, GetSsoAuthUrlParams>) => {
  return useMutation({
    mutationFn: (payload: GetSsoAuthUrlParams) => getSSOLoginURLAPI(payload),
    onSuccess: (res) => {
      window.location.href = res.data.url
      onSuccess?.(res)
    },
    onError,
    onMutate,
  })
}

export const useValidateOTPMutation = ({
  onSuccess,
  onError,
  onMutate,
}: IMutation<IResponseData<unknown>, IValidateOTPRequest>) => {
  return useMutation({
    mutationFn: (payload: IValidateOTPRequest) => validateOTPAPI(payload as IValidateOTPRequest),
    onSuccess,
    onError,
    onMutate,
  })
}
