import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Suspense } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({
  getGoogleLoginURL: vi.fn(),
  register: vi.fn(),
  registerOptions: undefined as
    | { onSuccess?: (data: unknown, request?: { email?: string }) => void }
    | undefined,
}))
const navigate = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    createFileRoute: () => (options: unknown) => options,
    Link: ({ children, ...props }: React.ComponentProps<'a'>) => <a {...props}>{children}</a>,
    useNavigate: () => navigate,
  }
})
vi.mock('@/queries/use-auth-query', () => ({
  useGetGoogleLoginURL: () => ({ mutateAsync: auth.getGoogleLoginURL, isPending: false }),
  useRegisterMutation: (options: typeof auth.registerOptions) => {
    auth.registerOptions = options
    return { mutateAsync: auth.register, isPending: false, error: null }
  },
}))
vi.mock('@/lib/translation', () => ({
  getTranslations: () => ({
    register_name_label: () => 'Name',
    register_name_placeholder: () => 'Your name',
    register_email_label: () => 'Email',
    register_email_placeholder: () => 'you@example.com',
    register_password_label: () => 'Password',
    register_password_placeholder: () => 'Password',
    register_confirm_password_label: () => 'Confirm password',
    register_confirm_password_placeholder: () => 'Confirm password',
    register_failed: () => 'Registration failed',
    register_submit: () => 'Register',
    register_or_continue_with: () => 'Or continue with',
    register_google: () => 'Google',
    register_have_account: () => 'Already have an account?',
    register_login_link: () => 'Sign in',
    validation_name_required: () => 'Name required',
    validation_email_required: () => 'Email required',
    validation_email_invalid: () => 'Email invalid',
    validation_password_required: () => 'Password required',
    validation_password_min_length: () => 'Password too short',
    validation_password_lowercase: () => 'Password lowercase',
    validation_password_uppercase: () => 'Password uppercase',
    validation_password_number: () => 'Password number',
    validation_password_special: () => 'Password special',
    validation_confirm_password_required: () => 'Confirm password required',
    validation_passwords_mismatch: () => 'Passwords differ',
  }),
}))

import { Route } from '@/routes/_guest/register'

const renderRegisterPage = () =>
  render(
    <Suspense fallback={null}>
      <Route.component />
    </Suspense>,
  )

describe('RegisterPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    auth.registerOptions = undefined
    await (Route.component as unknown as { preload?: () => Promise<void> }).preload?.()
  })

  it('registers valid details then navigates to OTP with the submitted email', async () => {
    const user = userEvent.setup()
    auth.register.mockImplementation(async (request) =>
      auth.registerOptions?.onSuccess?.({}, request),
    )
    renderRegisterPage()

    await user.type(await screen.findByTestId('name-input'), 'Operator')
    await user.type(screen.getByTestId('email-input'), 'operator@example.com')
    await user.type(screen.getByTestId('password-input'), 'Password1!')
    await user.type(screen.getByTestId('confirm-password-input'), 'Password1!')
    await user.click(screen.getByTestId('register-button'))

    await waitFor(() =>
      expect(auth.register).toHaveBeenCalledWith({
        name: 'Operator',
        email: 'operator@example.com',
        password: 'Password1!',
      }),
    )
    expect(navigate).toHaveBeenCalledWith({ to: '/otp', state: { email: 'operator@example.com' } })
  })

  it('toggles both password fields independently and starts Google sign-in', async () => {
    const user = userEvent.setup()
    renderRegisterPage()

    await screen.findByTestId('password-input')
    const passwordButtons = screen.getAllByRole('button', { name: '' })
    await user.click(passwordButtons[0])
    expect(screen.getByTestId('password-input')).toHaveAttribute('type', 'text')
    expect(screen.getByTestId('confirm-password-input')).toHaveAttribute('type', 'password')

    await user.click(passwordButtons[1])
    expect(screen.getByTestId('confirm-password-input')).toHaveAttribute('type', 'text')
    await user.click(screen.getByRole('button', { name: 'Google' }))
    expect(auth.getGoogleLoginURL).toHaveBeenCalledWith({ provider: 'google' })
  })
})
