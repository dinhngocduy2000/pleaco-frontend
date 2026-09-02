import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Suspense } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({
  getGoogleLoginURL: vi.fn(),
  login: vi.fn(),
  loginOptions: undefined as { onSuccess?: () => void } | undefined,
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
  useLoginMutation: (options: typeof auth.loginOptions) => {
    auth.loginOptions = options
    return { mutateAsync: auth.login, isPending: false, error: null }
  },
}))
vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
  }: {
    checked: boolean
    onCheckedChange: (checked: boolean) => void
  }) => (
    <input
      checked={checked}
      onChange={(event) => onCheckedChange(event.target.checked)}
      type="checkbox"
    />
  ),
}))
vi.mock('@/lib/translation', () => ({
  getTranslations: () => ({
    login_email_label: () => 'Email',
    login_email_placeholder: () => 'you@example.com',
    login_password_label: () => 'Password',
    login_password_placeholder: () => 'Password',
    login_remember_me: () => 'Remember me',
    login_failed: () => 'Login failed',
    login_submit: () => 'Sign in',
    login_or_continue_with: () => 'Or continue with',
    login_google: () => 'Google',
    login_no_account: () => 'No account?',
    login_register_link: () => 'Register',
    validation_email_required: () => 'Email required',
    validation_email_invalid: () => 'Email invalid',
    validation_password_required: () => 'Password required',
  }),
}))

import { Route } from '@/routes/_guest/login'

const renderLoginPage = () =>
  render(
    <Suspense fallback={null}>
      <Route.component />
    </Suspense>,
  )

describe('LoginPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    auth.loginOptions = undefined
    await (Route.component as unknown as { preload?: () => Promise<void> }).preload?.()
  })

  it('submits valid credentials and redirects after a successful login', async () => {
    const user = userEvent.setup()
    auth.login.mockImplementation(async () => auth.loginOptions?.onSuccess?.())
    renderLoginPage()

    await user.type(await screen.findByTestId('email-input'), 'operator@example.com')
    await user.type(screen.getByTestId('password-input'), 'Password1!')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByTestId('login-button'))

    await waitFor(() =>
      expect(auth.login).toHaveBeenCalledWith({
        email: 'operator@example.com',
        password: 'Password1!',
        is_save_session: true,
      }),
    )
    expect(navigate).toHaveBeenCalledWith({ to: '/' })
  })

  it('toggles password visibility and starts Google sign-in', async () => {
    const user = userEvent.setup()
    renderLoginPage()

    const password = await screen.findByTestId('password-input')
    expect(password).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: '' }))
    expect(password).toHaveAttribute('type', 'text')

    await user.click(screen.getByTestId('login-google'))
    expect(auth.getGoogleLoginURL).toHaveBeenCalledWith({ provider: 'google' })
  })
})
