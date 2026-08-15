import axios, { AxiosError, type AxiosResponse, HttpStatusCode } from 'axios'
import { KEY_STORAGE } from '@/enum/key-storage'
import { ENV_CONFIGS } from '@/lib/env-const'
import { handleLogout } from '@/lib/utils'
import { refreshTokenAPI } from './auth'

const axiosConfig = axios.create({
  baseURL: `${ENV_CONFIGS.VITE_API_ENDPOINT}`,
  headers: {
    'Content-Type': 'application/json',
  },
})
// Add a request interceptor
axiosConfig.interceptors.request.use(
  (config) => {
    config.withCredentials = true
    return config
  },
  (error) =>
    // Do something with request error
    Promise.reject(error),
)
// Add a response interceptor
axiosConfig.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  async (error) => {
    if (!error.response) {
      return Promise.reject(error)
    }
    switch (error.response.status) {
      case HttpStatusCode.Forbidden:
        // handleLogout()
        break
      case HttpStatusCode.NotFound:
        break
      case HttpStatusCode.Unauthorized:
        return await handleRenewToken(error)

      case HttpStatusCode.InternalServerError:
        break
      default:
        break
    }

    return Promise.reject(error)
  },
)

export const axiosConfigWithoutAuth = axios.create({
  baseURL: ENV_CONFIGS.VITE_API_ENDPOINT as string,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add a response interceptor
axiosConfigWithoutAuth.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  async (error) => {
    if (!error.response) {
      return Promise.reject(error)
    }
    return Promise.reject(error)
  },
)

const renewToken = async () => {
  try {
    const isLoggedIn = localStorage.getItem(KEY_STORAGE.IS_LOGGED_IN)
    if (!isLoggedIn) {
      handleLogout()
      throw new Error('Not logged in')
    }
    const data = {
      is_save_session: localStorage.getItem(KEY_STORAGE.IS_SAVE_SESSION) === 'true',
    }
    await refreshTokenAPI(data)
    localStorage.setItem(KEY_STORAGE.IS_LOGGED_IN, 'true')
    if (data.is_save_session) {
      localStorage.setItem(KEY_STORAGE.IS_SAVE_SESSION, 'true')
    }
  } catch (err) {
    handleLogout()
    throw err
  }
}

const handleRenewToken = async (error: unknown) => {
  if (!(error instanceof AxiosError)) {
    return
  }
  const originalRequest = error.config
  if (!originalRequest) {
    return
  }
  await renewToken()

  return await axiosConfig(originalRequest)
}

export default axiosConfig
