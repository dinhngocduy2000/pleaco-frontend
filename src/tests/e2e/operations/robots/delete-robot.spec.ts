import { expect, type Page, test } from '@playwright/test'
import profileData from '../../data/profile.json' with { type: 'json' }
import robotData from '../../data/robots.json' with { type: 'json' }
import { setupAuthenticatedPage } from '../../utils/setup-authenticated'

const ROBOTS_URL = '/operations/robots'
const API_BOTS = '**/api/v1/bots**'
const API_TAGS = '**/api/v1/tags**'
const ROBOT_NAME = 'Lobby Guardian'
const ROBOT_ID = robotData.initialRobots[0].id

type Robot = (typeof robotData.initialRobots)[number]
type DeleteOutcome = 'success' | 'error'

const copyRobots = (): Robot[] =>
  robotData.initialRobots.map((robot) => ({
    ...robot,
    tags: robot.tags.map((tag) => ({ ...tag })),
  }))

async function setupRobotsPage(page: Page, deleteOutcome: DeleteOutcome) {
  const robots = copyRobots()

  await setupAuthenticatedPage(page, profileData.activeOwnerUser)
  await page.route(API_TAGS, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: robotData.dropdowns.tags, message: 'Success', statusCode: 200 }),
    }),
  )
  await page.route(API_BOTS, (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: robots,
          page: 1,
          page_size: 10,
          total: robots.length,
          message: 'Success',
          statusCode: 200,
        }),
      })
    }

    if (deleteOutcome === 'error') {
      return route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: 'Unable to delete this robot while it has active assignments.',
        }),
      })
    }

    const robotIndex = robots.findIndex((robot) => robot.id === ROBOT_ID)
    robots.splice(robotIndex, 1)
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: null, message: 'Success', statusCode: 200 }),
    })
  })

  await page.goto(ROBOTS_URL)
  await expect(page.getByRole('heading', { name: 'Robots' })).toBeVisible()
  await expect(page.getByText(ROBOT_NAME, { exact: true })).toBeVisible()
}

async function openDeleteConfirmation(page: Page) {
  await page.getByRole('button', { name: `Robot options: ${ROBOT_NAME}` }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  const confirmation = page.getByRole('alertdialog')
  await expect(confirmation).toContainText(`Are you sure you want to delete robot ${ROBOT_NAME}?`)
  return confirmation
}

test.describe('Delete robot', () => {
  test('removes the robot from the refreshed list after confirmation', async ({ page }) => {
    await setupRobotsPage(page, 'success')
    const confirmation = await openDeleteConfirmation(page)

    const responsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'DELETE' && response.url().endsWith(`/bots/${ROBOT_ID}`),
    )
    await confirmation.getByRole('button', { name: 'Confirm' }).click()
    const response = await responsePromise

    expect(response.status()).toBe(200)
    await expect(page.getByText(`Robot ${ROBOT_NAME} was deleted successfully.`)).toBeVisible()
    await expect(confirmation).toHaveCount(0)
    await expect(page.getByText(ROBOT_NAME, { exact: true })).toHaveCount(0)
    await expect(page.getByText('Night Runner', { exact: true })).toBeVisible()
  })

  test('keeps the robot visible and shows the API error when deletion fails', async ({ page }) => {
    await setupRobotsPage(page, 'error')
    const confirmation = await openDeleteConfirmation(page)

    const responsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'DELETE' && response.url().endsWith(`/bots/${ROBOT_ID}`),
    )
    await confirmation.getByRole('button', { name: 'Confirm' }).click()
    const response = await responsePromise

    expect(response.status()).toBe(500)
    await expect(
      page.getByText('Unable to delete this robot while it has active assignments.'),
    ).toBeVisible()
    await expect(confirmation).toBeVisible()
    await expect(page.getByText(ROBOT_NAME, { exact: true })).toBeVisible()
  })
})
