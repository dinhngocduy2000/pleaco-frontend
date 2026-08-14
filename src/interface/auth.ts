import type z from 'zod'
import type { UserStatusType } from '@/enum/users'
import type {
  createEmailSchemas,
  createLoginFormSchemas,
  createOtpSchemas,
  createPasswordSchemas,
  createRegisterFormSchemas,
} from '@/schemas/auth-schemas'
import type { IOption } from './utils'

export const SsoProviders = {
  google: 'google',
  facebook: 'facebook',
} as const
export type IEmailFormType = z.infer<ReturnType<typeof createEmailSchemas>>
export type IPasswordFormType = z.infer<ReturnType<typeof createPasswordSchemas>>
export type IOTPFormType = z.infer<ReturnType<typeof createOtpSchemas>>
export type ILoginFormType = z.infer<ReturnType<typeof createLoginFormSchemas>>
export type IRegisterFormType = z.infer<ReturnType<typeof createRegisterFormSchemas>>

export type ILoginRequest = {
  email: string
  is_save_session?: boolean
} & Partial<IPasswordFormType> &
  Partial<IOTPFormType>

export type IRegisterRequest = Omit<IRegisterFormType, 'confirmPassword'>

export type IVerifyOTPRequest = IEmailFormType & IOTPFormType

export type IVerifyGoogleCodeRequest = {
  code: string
  redirectUri: string
}

/** Profile payload from `GET /auth/profile` (snake_case, distinct from login `IUserProfile`). */
export type IUserProfileDetail = {
  id: string
  name: string
  email: string
  status: UserStatusType
  created_at: string
  updated_at: string
  image_url: string
  group_id?: string | null
  group?: IOption | undefined
}

export type IRefreshTokenRequest = {
  refreshToken: string
}

export type IRefreshTokenResponse = {
  accessToken: string
  refreshToken: string
}

export type IValidateOTPRequest = {
  email: string
  otp: string
}

export type SSOAuthUrlResponse = {
  /** URL to redirect the user to for Google sign-in */
  url: string
}

export type SSOLoginResponse = {
  /** Data */
  data: SSOAuthUrlResponse
  /** Message */
  message: string
  /** Status code */
  statusCode: number
}

export type GetSsoAuthUrlParams = {
  /**
   * SSO Auth Provilder
   */
  provider: (typeof SsoProviders)[keyof typeof SsoProviders]
}
