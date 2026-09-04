import { expect, test } from '@playwright/test'

const REGISTER_URL = '/register'
const API_REGISTER = '**/api/v1/auth/register'

const VALID_NAME = 'Test User'
const VALID_EMAIL = 'user@example.com'
const VALID_PASSWORD = 'P@ssword123'

test.describe('Register page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(REGISTER_URL)
  })

  test.describe('form rendering', () => {
    test('displays all form elements', async ({ page }) => {
      await expect(page.getByTestId('register_title')).toBeVisible()
      await expect(page.getByTestId('register_description')).toBeVisible()
      await expect(page.getByTestId('name')).toBeVisible()
      await expect(page.getByTestId('email')).toBeVisible()
      await expect(page.getByTestId('password')).toBeVisible()
      await expect(page.getByTestId('confirm-password')).toBeVisible()
      await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible()
    })

    test('submit button is disabled when form is empty', async ({ page }) => {
      await expect(page.getByRole('button', { name: /sign up/i })).toBeDisabled()
    })

    test('displays link to login page', async ({ page }) => {
      const loginLink = page.getByRole('link', { name: /sign in/i })
      await expect(loginLink).toBeVisible()
      await expect(loginLink).toHaveAttribute('href', '/login')
    })
  })

  test.describe('form validation', () => {
    test('shows error when name is cleared after input', async ({ page }) => {
      await page.getByTestId('name-input').fill(VALID_NAME)
      await page.getByTestId('name-input').clear()
      await page.getByTestId('email-input').click()

      await expect(page.getByText(/name is required/i)).toBeVisible()
    })

    test('shows error when email is cleared after input', async ({ page }) => {
      await page.getByTestId('email-input').fill(VALID_EMAIL)
      await page.getByTestId('email-input').clear()
      await page.getByTestId('name-input').click()

      await expect(page.getByText(/email is required/i)).toBeVisible()
    })

    test('shows error for invalid email format', async ({ page }) => {
      await page.getByTestId('email-input').fill('not-an-email')
      await page.getByTestId('name-input').click()

      await expect(page.getByText(/invalid email format/i)).toBeVisible()
    })

    test('shows error when password is cleared after input', async ({ page }) => {
      await page.getByTestId('password-input').fill(VALID_PASSWORD)
      await page.getByTestId('password-input').clear()
      await page.getByTestId('email-input').click()

      await expect(page.getByText(/password is required/i)).toBeVisible()
    })

    test('shows error for password shorter than 8 characters', async ({ page }) => {
      await page.getByTestId('password-input').fill('Ab1@')
      await page.getByTestId('email-input').click()

      await expect(page.getByText(/password must be at least 8 characters/i)).toBeVisible()
    })

    test('shows error for password without lowercase letter', async ({ page }) => {
      await page.getByTestId('password-input').fill('ABCDEFG1@')
      await page.getByTestId('email-input').click()

      await expect(
        page.getByText(/password must include at least 1 lowercase letter/i),
      ).toBeVisible()
    })

    test('shows error for password without uppercase letter', async ({ page }) => {
      await page.getByTestId('password-input').fill('abcdefg1@')
      await page.getByTestId('email-input').click()

      await expect(
        page.getByText(/password must include at least 1 uppercase letter/i),
      ).toBeVisible()
    })

    test('shows error for password without number', async ({ page }) => {
      await page.getByTestId('password-input').fill('Abcdefgh@')
      await page.getByTestId('email-input').click()

      await expect(page.getByText(/password must include at least 1 number/i)).toBeVisible()
    })

    test('shows error for password without special character', async ({ page }) => {
      await page.getByTestId('password-input').fill('Abcdefg1')
      await page.getByTestId('email-input').click()

      await expect(
        page.getByText(/password must include at least 1 special character/i),
      ).toBeVisible()
    })

    test('shows error when confirm password is cleared after input', async ({ page }) => {
      await page.getByTestId('confirm-password-input').fill(VALID_PASSWORD)
      await page.getByTestId('confirm-password-input').clear()
      await page.getByTestId('email-input').click()

      await expect(page.getByText(/please confirm your password/i)).toBeVisible()
    })

    test('shows error when passwords do not match', async ({ page }) => {
      await page.getByTestId('password-input').fill(VALID_PASSWORD)
      await page.getByTestId('confirm-password-input').fill('Different1@')
      await page.getByTestId('email-input').click()

      await expect(page.getByText(/passwords do not match/i)).toBeVisible()
    })

    test('submit button becomes enabled with valid inputs', async ({ page }) => {
      await page.getByTestId('name-input').fill(VALID_NAME)
      await page.getByTestId('email-input').fill(VALID_EMAIL)
      await page.getByTestId('password-input').fill(VALID_PASSWORD)
      await page.getByTestId('confirm-password-input').fill(VALID_PASSWORD)

      await expect(page.getByTestId('register-button')).toBeEnabled()
    })
  })

  test.describe('password visibility toggles', () => {
    test('password fields are hidden by default', async ({ page }) => {
      await expect(page.getByTestId('password-input')).toHaveAttribute('type', 'password')
      await expect(page.getByTestId('confirm-password-input')).toHaveAttribute('type', 'password')
    })

    test('toggles password visibility', async ({ page }) => {
      await page.getByTestId('password-input').fill(VALID_PASSWORD)

      const passwordField = page.getByTestId('password-input')
      const toggleButton = passwordField.locator('..').locator('button')
      await toggleButton.click()
      await expect(passwordField).toHaveAttribute('type', 'text')

      await toggleButton.click()
      await expect(passwordField).toHaveAttribute('type', 'password')
    })

    test('toggles confirm password visibility', async ({ page }) => {
      await page.getByTestId('confirm-password-input').fill(VALID_PASSWORD)

      const confirmField = page.getByTestId('confirm-password-input')
      const toggleButton = confirmField.locator('..').locator('button')
      await toggleButton.click()
      await expect(confirmField).toHaveAttribute('type', 'text')

      await toggleButton.click()
      await expect(confirmField).toHaveAttribute('type', 'password')
    })
  })

  test.describe('registration submission', () => {
    test('redirects to login on successful registration', async ({ page }) => {
      await page.route(API_REGISTER, (route) =>
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            data: null,
            message: 'Registration successful',
            statusCode: 201,
          }),
        }),
      )

      await page.getByTestId('name-input').fill(VALID_NAME)
      await page.getByTestId('email-input').fill(VALID_EMAIL)
      await page.getByTestId('password-input').fill(VALID_PASSWORD)
      await page.getByTestId('confirm-password-input').fill(VALID_PASSWORD)
      await page.getByTestId('register-button').click()

      await expect(page).toHaveURL('/otp')
    })

    test('sends correct payload without confirmPassword', async ({ page }) => {
      let capturedBody: Record<string, unknown> | null = null

      await page.route(API_REGISTER, async (route) => {
        capturedBody = route.request().postDataJSON()
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            data: null,
            message: 'Registration successful',
            statusCode: 201,
          }),
        })
      })

      await page.getByTestId('name-input').fill(VALID_NAME)
      await page.getByTestId('email-input').fill(VALID_EMAIL)
      await page.getByTestId('password-input').fill(VALID_PASSWORD)
      await page.getByTestId('confirm-password-input').fill(VALID_PASSWORD)

      const responsePromise = page.waitForResponse(API_REGISTER)
      await page.getByTestId('register-button').click()
      await responsePromise

      expect(capturedBody).toMatchObject({
        name: VALID_NAME,
        email: VALID_EMAIL,
        password: VALID_PASSWORD,
      })
      expect(capturedBody).not.toHaveProperty('confirmPassword')
    })

    test('displays server error message on failed registration', async ({ page }) => {
      await page.route(API_REGISTER, (route) =>
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            data: null,
            detail: 'Email already exists',
            statusCode: 400,
          }),
        }),
      )

      await page.getByTestId('name-input').fill(VALID_NAME)
      await page.getByTestId('email-input').fill(VALID_EMAIL)
      await page.getByTestId('password-input').fill(VALID_PASSWORD)
      await page.getByTestId('confirm-password-input').fill(VALID_PASSWORD)
      await page.getByTestId('register-button').click()

      await expect(page.getByText('Email already exists')).toBeVisible()
    })

    test('displays fallback error when server returns no message', async ({ page }) => {
      await page.route(API_REGISTER, (route) =>
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({}),
        }),
      )

      await page.getByTestId('name-input').fill(VALID_NAME)
      await page.getByTestId('email-input').fill(VALID_EMAIL)
      await page.getByTestId('password-input').fill(VALID_PASSWORD)
      await page.getByTestId('confirm-password-input').fill(VALID_PASSWORD)
      await page.getByTestId('register-button').click()

      await expect(page.getByText('Registration failed. Please try again.')).toBeVisible()
    })
  })

  test.describe('navigation', () => {
    test('navigates to login page via sign in link', async ({ page }) => {
      await page.getByRole('link', { name: /sign in/i }).click()
      await expect(page).toHaveURL('/login')
    })
  })
})
