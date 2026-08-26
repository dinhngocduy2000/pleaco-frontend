import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { KEY_STORAGE } from '@/enum/key-storage'
import { ROUTES } from '@/enum/routes'
import type { IAxiosError } from '@/interface/utils'
import { getTranslations } from './translation'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const handleLogout = () => {
  window.location.replace(ROUTES.LOGIN)
  localStorage.removeItem(KEY_STORAGE.IS_LOGGED_IN)
  localStorage.removeItem(KEY_STORAGE.IS_SAVE_SESSION)
  localStorage.removeItem(KEY_STORAGE.INVITATION_ID)
}

export const getErrorMessage = (error: IAxiosError) => {
  const translation = getTranslations()
  return error?.response?.data?.detail || translation.error_default()
}

export const paramsSerializer = (params: unknown): string => {
  if (!params || typeof params !== 'object') return ''

  const searchParams = new URLSearchParams()

  Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item) {
          searchParams.append(key, String(item))
        }
      })
    } else {
      if (value) {
        searchParams.append(key, String(value))
      }
    }
  })

  return searchParams.toString()
}
