import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Suspense } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({
  options: undefined as { onError?: () => void; onSuccess?: () => void } | undefined,
  validateOTP: vi.fn(),
}))
const navigate = vi.hoisted(() => vi.fn())
const routerState = vi.hoisted(() => ({ email: 'operator@example.com' as string | undefined }))
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    createFileRoute: () => (options: unknown) => options,
    useNavigate: () => navigate,
    useRouterState: ({
      select,
    }: {
      select: (state: { location: { state: typeof routerState } }) => unknown
    }) => select({ location: { state: routerState } }),
  }
})
vi.mock('@/queries/use-auth-query', () => ({
  useValidateOTPMutation: (options: typeof auth.options) => {
    auth.options = options
    return { mutateAsync: auth.validateOTP, isPending: false }
  },
}))
vi.mock('sonner', () => ({ toast }))
vi.mock('@/components/ui/input-otp', () => ({
  InputOTP: ({
    children,
    onChange,
    onComplete: _onComplete,
    value,
    ...props
  }: React.PropsWithChildren<React.ComponentProps<'input'> & { onComplete?: () => void }>) => (
    <div>
      <input aria-label="One-time password" onChange={onChange} value={value ?? ''} {...props} />
      {children}
    </div>
  ),
  InputOTPGroup: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  InputOTPSlot: () => <span />,
}))
vi.mock('@/lib/translation', () => ({
  getTranslations: () => ({
    sent_code_text: () => 'We sent a code to',
    validation_otp_incorrect: () => 'Incorrect code',
    validation_email_required: () => 'Email required',
    validation_otp_required: () => 'OTP required',
    otp_verified_success: () => 'OTP verified',
    didnt_get_code_text: () => "Didn't get a code?",
    click_to_resend: () => 'Resend',
    otp_button: () => 'Verify code',
  }),
}))

import { Route } from '@/routes/_guest/otp'

const renderOTPSignup = () =>
  render(
    <Suspense fallback={null}>
      <Route.component />
    </Suspense>,
  )

describe('OTPSignup', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    auth.options = undefined
    routerState.email = 'operator@example.com'
    await (Route.component as unknown as { preload?: () => Promise<void> }).preload?.()
  })

  it('validates the OTP and redirects after successful verification', async () => {
    const user = userEvent.setup()
    auth.validateOTP.mockImplementation(async () => auth.options?.onSuccess?.())
    renderOTPSignup()

    await user.type(await screen.findByRole('textbox', { name: 'One-time password' }), '123456')
    await user.click(screen.getByRole('button', { name: 'Verify code' }))

    await waitFor(() =>
      expect(auth.validateOTP).toHaveBeenCalledWith({
        email: 'operator@example.com',
        otp: '123456',
      }),
    )
    expect(navigate).toHaveBeenCalledWith({ to: '/' })
    expect(toast.success).toHaveBeenCalledWith('OTP verified')
  })

  it('requires an email in router state before submitting the OTP', async () => {
    const user = userEvent.setup()
    routerState.email = undefined
    renderOTPSignup()

    await user.type(await screen.findByRole('textbox', { name: 'One-time password' }), '123456')
    await user.click(screen.getByRole('button', { name: 'Verify code' }))

    expect(auth.validateOTP).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Email required')
  })

  it('shows the validation error provided by a failed OTP request', async () => {
    const user = userEvent.setup()
    auth.validateOTP.mockImplementation(async () => auth.options?.onError?.())
    renderOTPSignup()

    await user.type(await screen.findByRole('textbox', { name: 'One-time password' }), '123456')
    await user.click(screen.getByRole('button', { name: 'Verify code' }))

    expect(await screen.findByText('Incorrect code')).toBeInTheDocument()
  })
})
