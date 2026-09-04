import type { Page } from '@playwright/test'
export const API_PROFILE = '**/api/v1/auth/profile'
export const API_TRACK_SESSION = '**/api/v1/auth/track'
export const API_EVENTS = '**/api/v1/events**'
export const API_KEY_VALUE_LIST = '**/api/v1/groups/key-value'
export const HOME_URL = '/'

export async function setupAuthenticatedPage(page: Page, profileResponse: unknown) {
  await page.addInitScript(() => {
    localStorage.setItem('is_logged_in', 'true')
  })

  await page.route(API_TRACK_SESSION, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: null, message: 'OK', statusCode: 200 }),
    }),
  )

  await page.route(API_PROFILE, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(profileResponse),
    }),
  )

  await page.route(API_EVENTS, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], message: 'OK', statusCode: 200 }),
    }),
  )

  await page.route(API_KEY_VALUE_LIST, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], message: 'OK', statusCode: 200 }),
    }),
  )
}
