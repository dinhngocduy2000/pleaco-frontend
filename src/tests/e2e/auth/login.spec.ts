import { expect, test } from '@playwright/test'

const LOGIN_URL = '/login'
const API_LOGIN = '**/api/v1/auth/login'

const VALID_EMAIL = 'user@example.com'
const VALID_PASSWORD = 'P@ssword123'

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(LOGIN_URL)
  })

  test.describe('form rendering', () => {
    test('displays all form elements', async ({ page }) => {
      await expect(page.getByTestId('login_title')).toBeVisible()
      await expect(page.getByTestId('login_description')).toBeVisible()
      await expect(page.getByTestId('email')).toBeVisible()
      await expect(page.getByTestId('password')).toBeVisible()
      await expect(page.getByRole('checkbox', { name: /remember me/i })).toBeVisible()
      await expect(page.getByTestId('login-button')).toBeVisible()
      await expect(page.getByTestId('login-google')).toBeVisible()
    })

    test('submit button is disabled when form is empty', async ({ page }) => {
      await expect(page.getByTestId('login-button')).toBeDisabled()
    })
  })

  test.describe('form validation', () => {
    test('shows error for invalid email format', async ({ page }) => {
      await page.getByTestId('email-input').fill('not-an-email')
      await page.getByTestId('password-input').fill(VALID_PASSWORD)
      await expect(page.getByText(/invalid email format/i)).toBeVisible()
    })

    test('shows error when email is cleared after input', async ({ page }) => {
      await page.getByTestId('email-input').fill(VALID_EMAIL)
      await page.getByTestId('email-input').clear()
      await page.getByTestId('password-input').click()

      await expect(page.getByText(/email is required/i)).toBeVisible()
    })

    test('shows error when password is cleared after input', async ({ page }) => {
      await page.getByTestId('password-input').fill(VALID_PASSWORD)
      await page.getByTestId('password-input').clear()
      await page.getByTestId('email-input').click()

      await expect(page.getByText(/password is required/i)).toBeVisible()
    })

    test('submit button becomes enabled with valid inputs', async ({ page }) => {
      await page.getByTestId('email-input').fill(VALID_EMAIL)
      await page.getByTestId('password-input').fill(VALID_PASSWORD)

      await expect(page.getByTestId('login-button')).toBeEnabled()
    })
  })

  test.describe('password visibility toggle', () => {
    test('password is hidden by default', async ({ page }) => {
      await page.getByTestId('password-input').fill(VALID_PASSWORD)
      await expect(page.getByTestId('password-input')).toHaveAttribute('type', 'password')
    })

    test('toggles password visibility on button click', async ({ page }) => {
      await page.getByTestId('password-input').fill(VALID_PASSWORD)

      const toggleButton = page.locator('button:has(svg)', {
        has: page.locator('.lucide-eye, .lucide-eye-off'),
      })
      await toggleButton.click()
      await expect(page.getByTestId('password-input')).toHaveAttribute('type', 'text')

      await toggleButton.click()
      await expect(page.getByTestId('password-input')).toHaveAttribute('type', 'password')
    })
  })

  test.describe('remember me checkbox', () => {
    test('is unchecked by default', async ({ page }) => {
      await expect(page.getByRole('checkbox', { name: /remember me/i })).not.toBeChecked()
    })

    test('can be toggled', async ({ page }) => {
      const checkbox = page.getByRole('checkbox', { name: /remember me/i })
      await checkbox.click()
      await expect(checkbox).toBeChecked()

      await checkbox.click()
      await expect(checkbox).not.toBeChecked()
    })
  })

  test.describe('login submission', () => {
    test('redirects to home on successful login', async ({ page }) => {
      await page.route(API_LOGIN, (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              accessToken: 'mock-access-token',
              refreshToken: 'mock-refresh-token',
              user: {
                id: '1',
                email: VALID_EMAIL,
                fullName: 'Test User',
                active: true,
                avatar: '',
                activeOrganizationId: 'org-1',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            },
            message: 'Login successful',
            statusCode: 200,
          }),
        }),
      )

      await page.getByTestId('email-input').fill(VALID_EMAIL)
      await page.getByTestId('password-input').fill(VALID_PASSWORD)
      await page.getByTestId('login-button').click()

      await expect(page).toHaveURL('/')
    })

    test('sends correct payload including is_save_session', async ({ page }) => {
      let capturedBody: Record<string, unknown> | null = null

      await page.route(API_LOGIN, async (route) => {
        capturedBody = route.request().postDataJSON()
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              accessToken: 'mock-access-token',
              refreshToken: 'mock-refresh-token',
              user: {
                id: '1',
                email: 'ngocduydinh2000@gmail.com',
                fullName: 'Test User',
                active: true,
                avatar: '',
                activeOrganizationId: 'org-1',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            },
            message: 'Login successful',
            statusCode: 200,
          }),
        })
      })

      await page.getByTestId('email-input').fill('ngocduydinh2000@gmail.com')
      await page.getByTestId('password-input').fill('123456aA@')
      await page.getByRole('checkbox', { name: /remember me/i }).click()

      const responsePromise = page.waitForResponse(API_LOGIN)
      await page.getByTestId('login-button').click()
      await responsePromise

      expect(capturedBody).toMatchObject({
        email: 'ngocduydinh2000@gmail.com',
        password: '123456aA@',
        is_save_session: true,
      })
    })

    test('displays server error message on failed login', async ({ page }) => {
      await page.route(API_LOGIN, (route) =>
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            data: null,
            detail: 'Invalid password',
            statusCode: 401,
          }),
        }),
      )

      await page.getByTestId('email-input').fill('ngocduydinh2000@gmail.com')
      await page.getByTestId('password-input').fill('123456aB@')
      await page.getByTestId('login-button').click()

      await expect(page.getByText('Invalid password')).toBeVisible()
    })

    test('displays fallback error when server returns no message', async ({ page }) => {
      await page.route(API_LOGIN, (route) =>
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({}),
        }),
      )

      await page.getByTestId('email-input').fill('ngocduydinh2000@gmail.com')
      await page.getByTestId('password-input').fill('123456aB@')
      await page.getByTestId('login-button').click()

      await expect(page.getByText('Login failed. Please try again.')).toBeVisible()
    })
  })
})
