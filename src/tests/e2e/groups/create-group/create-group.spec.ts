import { expect, test } from '@playwright/test'
import groupData from '../../data/group.json' with { type: 'json' }
import profileData from '../../data/profile.json' with { type: 'json' }
import { API_PROFILE, HOME_URL, setupAuthenticatedPage } from '../../utils/setup-authenticated'

const API_CREATE_GROUP = '**/api/v1/groups/create'
const VALID_GROUP_NAME = 'My New Group'
const VALID_DESCRIPTION = 'A group for organizing events'

test.describe('Create group dialog', () => {
  test.describe('dialog visibility', () => {
    test('shows dialog when user status is PENDING', async ({ page }) => {
      await setupAuthenticatedPage(page, profileData.pendingUser)
      await page.goto(HOME_URL)

      await expect(page.getByText('Welcome to Pleaco!')).toBeVisible()
      await expect(
        page.getByText(
          'To get started, create a group. A group helps you organize events and collaborate with others.',
        ),
      ).toBeVisible()
    })

    test('shows dialog when user status is ACTIVE and user has no group', async ({ page }) => {
      await setupAuthenticatedPage(page, profileData.activeUserWithNoGroup)
      await page.goto(HOME_URL)

      await page.waitForResponse(API_PROFILE)

      await expect(page.getByText('Welcome to Pleaco!')).toBeVisible()
    })

    test('does not show dialog when user status is ACTIVE', async ({ page }) => {
      await setupAuthenticatedPage(page, profileData.activeUser)
      await page.goto(HOME_URL)

      await page.waitForResponse(API_PROFILE)

      await expect(page.getByText('Welcome to Pleaco!')).not.toBeVisible()
    })

    test('does not show dialog when user already has a group', async ({ page }) => {
      await setupAuthenticatedPage(page, profileData.userWithGroup)
      await page.goto(HOME_URL)

      await page.waitForResponse(API_PROFILE)

      await expect(page.getByText('Welcome to Pleaco!')).not.toBeVisible()
    })

    test('dialog cannot be dismissed by clicking overlay', async ({ page }) => {
      await setupAuthenticatedPage(page, profileData.pendingUser)
      await page.goto(HOME_URL)
      await page.waitForResponse(API_PROFILE)
      await expect(page.getByText('Welcome to Pleaco!')).toBeVisible()

      await page
        .locator('[data-slot="dialog-overlay"]')
        .click({ position: { x: 10, y: 10 }, force: true })

      await expect(page.getByText('Welcome to Pleaco!')).toBeVisible()
    })

    test('dialog does not have a Cancel button visible', async ({ page }) => {
      await setupAuthenticatedPage(page, profileData.pendingUser)
      await page.goto(HOME_URL)

      await expect(page.getByText('Welcome to Pleaco!')).toBeVisible()
      await expect(page.getByRole('button', { name: /cancel/i })).not.toBeVisible()
    })

    test('dialog does not have a close (X) button', async ({ page }) => {
      await setupAuthenticatedPage(page, profileData.pendingUser)
      await page.goto(HOME_URL)

      await expect(page.getByText('Welcome to Pleaco!')).toBeVisible()
      await expect(page.locator('[data-slot="dialog-header"]')).not.toBeVisible()
    })
  })

  test.describe('form rendering', () => {
    test.beforeEach(async ({ page }) => {
      await setupAuthenticatedPage(page, profileData.pendingUser)
      await page.goto(HOME_URL)
      await page.waitForResponse(API_PROFILE)
    })

    test('displays the app logo', async ({ page }) => {
      await expect(page.locator('svg').first()).toBeVisible()
    })

    test('displays Name and Description fields', async ({ page }) => {
      await expect(page.getByLabel(/name/i)).toBeVisible()
      await expect(page.getByLabel(/description/i)).toBeVisible()
    })

    test('displays "Get Started" submit button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /get started/i })).toBeVisible()
    })

    test('"Get Started" button is disabled when form is empty', async ({ page }) => {
      await expect(page.getByRole('button', { name: /get started/i })).toBeDisabled()
    })
  })

  test.describe('form validation', () => {
    test.beforeEach(async ({ page }) => {
      await setupAuthenticatedPage(page, profileData.pendingUser)
      await page.goto(HOME_URL)
    })

    test('shows error when name is cleared after input', async ({ page }) => {
      await page.getByLabel(/name/i).fill(VALID_GROUP_NAME)
      await page.getByLabel(/name/i).clear()
      await page.getByLabel(/description/i).click()

      await expect(page.getByText(/group name is required/i)).toBeVisible()
    })

    test('shows error when name exceeds 50 characters', async ({ page }) => {
      const longName = 'a'.repeat(52)
      await page.getByLabel(/name/i).fill(longName)
      await page.getByLabel(/description/i).click()

      await expect(page.getByText(/group name must be at most 50 characters/i)).toBeVisible()
    })

    test('shows error when description exceeds 250 characters', async ({ page }) => {
      const longDescription = 'a'.repeat(251)
      await page.getByLabel(/description/i).fill(longDescription)
      await page.getByLabel(/name/i).click()

      await expect(page.getByText(/description must be at most 250 characters/i)).toBeVisible()
    })

    test('"Get Started" button becomes enabled with valid name', async ({ page }) => {
      await page.getByLabel(/name/i).fill(VALID_GROUP_NAME)

      await expect(page.getByRole('button', { name: /get started/i })).toBeEnabled()
    })

    test('"Get Started" button is enabled with name only (description optional)', async ({
      page,
    }) => {
      await page.getByLabel(/name/i).fill(VALID_GROUP_NAME)

      await expect(page.getByRole('button', { name: /get started/i })).toBeEnabled()
      await expect(page.getByLabel(/description/i)).toHaveValue('')
    })
  })

  test.describe('form submission', () => {
    test.beforeEach(async ({ page }) => {
      await setupAuthenticatedPage(page, profileData.pendingUser)
      await page.goto(HOME_URL)
      await page.waitForResponse(API_PROFILE)
    })

    test('sends correct payload on successful submission', async ({ page }) => {
      let capturedBody: Record<string, unknown> | null = null

      await page.route(API_CREATE_GROUP, async (route) => {
        capturedBody = route.request().postDataJSON()
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(groupData.createGroupSuccess),
        })
      })

      await page.route(API_PROFILE, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(profileData.activeUser),
        })
      })

      await page.getByLabel(/name/i).fill(VALID_GROUP_NAME)
      await page.getByLabel(/description/i).fill(VALID_DESCRIPTION)

      const responsePromise = page.waitForResponse(API_CREATE_GROUP)
      await page.getByRole('button', { name: /get started/i }).click()
      await responsePromise

      expect(capturedBody).toMatchObject({
        name: VALID_GROUP_NAME,
        description: VALID_DESCRIPTION,
      })
    })

    test('sends null description when description is empty', async ({ page }) => {
      let capturedBody: Record<string, unknown> | null = null

      await page.route(API_CREATE_GROUP, async (route) => {
        capturedBody = route.request().postDataJSON()
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(groupData.createGroupSuccess),
        })
      })

      await page.route(API_PROFILE, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(profileData.activeUser),
        })
      })

      await page.getByLabel(/name/i).fill(VALID_GROUP_NAME)

      const responsePromise = page.waitForResponse(API_CREATE_GROUP)
      await page.getByRole('button', { name: /get started/i }).click()
      await responsePromise

      expect(capturedBody).toMatchObject({
        name: VALID_GROUP_NAME,
        description: null,
      })
    })

    test('shows success toast on successful group creation', async ({ page }) => {
      await page.route(API_CREATE_GROUP, (route) =>
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(groupData.createGroupSuccess),
        }),
      )

      await page.route(API_PROFILE, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(profileData.activeUser),
        })
      })

      await page.getByLabel(/name/i).fill(VALID_GROUP_NAME)
      await page.getByRole('button', { name: /get started/i }).click()

      await expect(page.getByText('Group created successfully!')).toBeVisible()
    })

    test('closes dialog after successful submission', async ({ page }) => {
      await page.route(API_CREATE_GROUP, (route) =>
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(groupData.createGroupSuccess),
        }),
      )

      await page.route(API_PROFILE, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(profileData.activeUser),
        })
      })

      await page.getByLabel(/name/i).fill(VALID_GROUP_NAME)
      await page.getByRole('button', { name: /get started/i }).click()

      await expect(page.getByText('Welcome to Pleaco!')).not.toBeVisible({ timeout: 5000 })
    })

    test('shows server error toast on failed submission', async ({ page }) => {
      await page.route(API_CREATE_GROUP, (route) =>
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify(groupData.createGroupError),
        }),
      )

      await page.getByLabel(/name/i).fill(VALID_GROUP_NAME)
      await page.getByRole('button', { name: /get started/i }).click()

      await expect(page.getByText('A group with this name already exists')).toBeVisible()
    })

    test('shows fallback error toast when server returns no detail', async ({ page }) => {
      await page.route(API_CREATE_GROUP, (route) =>
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({}),
        }),
      )

      await page.getByLabel(/name/i).fill(VALID_GROUP_NAME)
      await page.getByRole('button', { name: /get started/i }).click()

      await expect(page.getByText('Failed to create group. Please try again.')).toBeVisible()
    })

    test('dialog remains open after failed submission', async ({ page }) => {
      await page.route(API_CREATE_GROUP, (route) =>
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify(groupData.createGroupError),
        }),
      )

      await page.getByLabel(/name/i).fill(VALID_GROUP_NAME)
      await page.getByRole('button', { name: /get started/i }).click()

      await expect(page.getByText('Welcome to Pleaco!')).toBeVisible()
      await expect(page.getByLabel(/name/i)).toBeVisible()
    })
  })
})
