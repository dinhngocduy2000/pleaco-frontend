import { expect, type Page, test } from '@playwright/test'
import profileData from '../data/profile.json' with { type: 'json' }
import { HOME_URL, setupAuthenticatedPage } from '../utils/setup-authenticated'

const API_LOGOUT = '**/api/v1/auth/logout'
const LOGIN_URL = '/login'

async function logoutFromProfileMenu(page: Page) {
  await page.getByRole('button', { name: 'TU' }).click()

  const logoutResponse = page.waitForResponse(API_LOGOUT)
  await page.getByRole('menuitem', { name: 'Logout' }).click()

  return await logoutResponse
}

test.describe('Logout', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedPage(page, profileData.activeUser)
    await page.route(API_LOGOUT, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: null, message: 'Logged out', statusCode: 200 }),
      }),
    )
    await page.goto(HOME_URL)
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await page.evaluate(() => {
      localStorage.setItem('is_save_session', 'true')
      localStorage.setItem('invitation_id', 'invitation-1')
    })
  })

  test('ends the application session and redirects to login', async ({ page }) => {
    const response = await logoutFromProfileMenu(page)

    expect(response.status()).toBe(200)
    await expect(page).toHaveURL(LOGIN_URL)
  })

  test('removes client-side authentication and session markers', async ({ page }) => {
    await logoutFromProfileMenu(page)
    await expect(page).toHaveURL(LOGIN_URL)

    const authStorage = await page.evaluate(() => ({
      isLoggedIn: localStorage.getItem('is_logged_in'),
      isSaveSession: localStorage.getItem('is_save_session'),
      invitationId: localStorage.getItem('invitation_id'),
    }))

    expect(authStorage).toEqual({
      isLoggedIn: null,
      isSaveSession: null,
      invitationId: null,
    })
  })

  test('prevents access to protected pages after logout', async ({ page }) => {
    await logoutFromProfileMenu(page)
    await expect(page).toHaveURL(LOGIN_URL)

    const protectedPage = await page.context().newPage()
    await protectedPage.goto(HOME_URL, { waitUntil: 'commit' })

    await expect(protectedPage).toHaveURL(LOGIN_URL)
    await expect(protectedPage.getByTestId('login_title')).toBeVisible()
  })
})
