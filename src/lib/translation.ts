import type { LANGUAGE } from '@/enum/language'
import { getLocale, setLocale } from '@/paraglide/runtime.js'
import { m as translations } from '../paraglide/messages.js'
export const getTranslations = () => translations

export const getCurrentLanguage = () => {
  return getLocale()
}

export const setCurrentLanguage = (language: LANGUAGE) => {
  setLocale(language)
}
