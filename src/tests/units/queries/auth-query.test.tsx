import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { KEY_STORAGE } from '@/enum/key-storage'
import { ROUTES } from '@/enum/routes'

const api = vi.hoisted(() => ({
  getProfileApi: vi.fn(),
  getSSOLoginURLAPI: vi.fn(),
  loginApi: vi.fn(),
  logoutAPI: vi.fn(),
  registerApi: vi.fn(),
  trackSession: vi.fn(),
  validateOTPAPI: vi.fn(),
}))
const navigate = vi.hoisted(() => vi.fn())
vi.mock('@/api/auth', () => api)
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))

import {
  GET_PROFILE_QUERY_KEY,
  GET_TRACK_SESSION_QUERY_KEY,
  useLoginMutation,
  useLogoutMutation,
  useProfileQuery,
  useRegisterMutation,
  useTrackSessionQuery,
  useValidateOTPMutation,
} from '@/queries/use-auth-query'

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, wrapper }
}

describe('auth query hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('loads profile and session using their query keys and cancellation signals', async () => {
    api.getProfileApi.mockResolvedValue({ data: { id: 'user-1' } })
    api.trackSession.mockResolvedValue({ data: null })
    const { client, wrapper } = createWrapper()
    const profile = renderHook(useProfileQuery, { wrapper })
    const session = renderHook(useTrackSessionQuery, { wrapper })
    await waitFor(() => expect(profile.result.current.isSuccess).toBe(true))
    await waitFor(() => expect(session.result.current.isSuccess).toBe(true))
    expect(api.getProfileApi).toHaveBeenCalledWith(expect.any(AbortSignal))
    expect(api.trackSession).toHaveBeenCalledWith(expect.any(AbortSignal))
    expect(client.getQueryData(GET_PROFILE_QUERY_KEY)).toEqual({ data: { id: 'user-1' } })
    expect(client.getQueryData(GET_TRACK_SESSION_QUERY_KEY)).toEqual({ data: null })
  })

  it('persists login state only when requested and invokes the supplied callback', async () => {
    api.loginApi.mockResolvedValue('ok')
    const onSuccess = vi.fn()
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useLoginMutation({ onSuccess }), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ email: 'a@b.com', password: 'pw', is_save_session: true })
    })
    expect(localStorage.getItem(KEY_STORAGE.IS_LOGGED_IN)).toBe('true')
    expect(localStorage.getItem(KEY_STORAGE.IS_SAVE_SESSION)).toBe('true')
    expect(onSuccess).toHaveBeenCalledOnce()
  })

  it('passes registration and OTP payloads through their mutations', async () => {
    api.registerApi.mockResolvedValue({ data: null })
    api.validateOTPAPI.mockResolvedValue({ data: null })
    const { wrapper } = createWrapper()
    const register = renderHook(() => useRegisterMutation(), { wrapper })
    const otp = renderHook(() => useValidateOTPMutation({}), { wrapper })
    await act(async () => {
      await register.result.current.mutateAsync({ name: 'A', email: 'a@b.com', password: 'pw' })
    })
    await act(async () => {
      await otp.result.current.mutateAsync({ email: 'a@b.com', otp: '123456' })
    })
    expect(api.registerApi).toHaveBeenCalledWith({ name: 'A', email: 'a@b.com', password: 'pw' })
    expect(api.validateOTPAPI).toHaveBeenCalledWith({ email: 'a@b.com', otp: '123456' })
  })

  it('clears auth state, removes profile data, and redirects after logout', async () => {
    api.logoutAPI.mockResolvedValue({})
    localStorage.setItem(KEY_STORAGE.IS_LOGGED_IN, 'true')
    localStorage.setItem(KEY_STORAGE.INVITATION_ID, 'invite-1')
    const onSuccess = vi.fn()
    const { client, wrapper } = createWrapper()
    client.setQueryData(GET_PROFILE_QUERY_KEY, { data: { id: 'user-1' } })
    const { result } = renderHook(() => useLogoutMutation({ onSuccess }), { wrapper })
    await act(async () => {
      await result.current.mutateAsync()
    })
    expect(client.getQueryData(GET_PROFILE_QUERY_KEY)).toBeUndefined()
    expect(localStorage.getItem(KEY_STORAGE.IS_LOGGED_IN)).toBeNull()
    expect(navigate).toHaveBeenCalledWith({ to: ROUTES.LOGIN })
    expect(onSuccess).toHaveBeenCalledOnce()
  })
})
