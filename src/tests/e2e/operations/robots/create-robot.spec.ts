import { expect, type Locator, type Page, test } from '@playwright/test'
import profileData from '../../data/profile.json' with { type: 'json' }
import robotData from '../../data/robots.json' with { type: 'json' }
import { setupAuthenticatedPage } from '../../utils/setup-authenticated'

const ROBOTS_URL = '/operations/robots'
const API_BOTS = '**/api/v1/bots**'
const API_TAGS = '**/api/v1/tags**'

type Robot = {
  id: string
  name: string
  serial_num: string
  model: string
  ip_address: string
  operational_status: string
  connection_status: string
  created_at: string
  tags: { id: string; name: string; color: string }[]
}
type CreateRobotRequest = {
  group_id: string
  name: string
  serial_num: string
  model: string
  map_id: string | null
  ip_address: string
  tags: string[]
}

const copyRobots = (): Robot[] => robotData.initialRobots.map((robot) => ({ ...robot, tags: [] }))

async function setupRobotsPage(page: Page, onCreate?: (request: CreateRobotRequest) => Robot) {
  const robots = copyRobots()

  await setupAuthenticatedPage(page, profileData.activeOwnerUser)
  await page.route(API_TAGS, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: robotData.dropdowns.tags, message: 'Success', statusCode: 200 }),
    }),
  )
  await page.route(API_BOTS, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
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
      return
    }

    const request = route.request().postDataJSON() as CreateRobotRequest
    const robot = onCreate?.(request)
    if (!robot) {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'A robot with this serial number already exists.' }),
      })
      return
    }

    robots.push(robot)
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: null, message: 'Success', statusCode: 200 }),
    })
  })

  await page.goto(ROBOTS_URL)
  await expect(page.getByRole('heading', { name: 'Robots' })).toBeVisible()
  await expect(page.getByText('Lobby Guardian', { exact: true })).toBeVisible()
}

async function openCreateDialog(page: Page) {
  await page.getByRole('button', { name: 'Create robot', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Create robot' })).toBeVisible()
  return dialog
}

async function fillValidRobot(dialog: Locator) {
  await dialog.getByLabel('Robot name').fill(robotData.newRobot.name)
  await dialog.getByLabel('Serial number').fill(robotData.newRobot.serial_num)
  await dialog.getByLabel('IP address').fill(robotData.newRobot.ip_address)
}

test.describe('Create robot', () => {
  test('shows inline validation errors for invalid robot details', async ({ page }) => {
    await setupRobotsPage(page)
    const dialog = await openCreateDialog(page)

    await dialog.getByLabel('Robot name').fill(' ')
    await dialog.getByLabel('Serial number').fill(' ')
    await dialog.getByLabel('IP address').fill('not-an-ip-address')

    await expect(dialog.getByText('Robot name is required')).toBeVisible()
    await expect(dialog.getByText('Serial number is required')).toBeVisible()
    await expect(dialog.getByText('Invalid IPv4 address')).toBeVisible()
  })

  test('enables creation only after the required form values are valid', async ({ page }) => {
    await setupRobotsPage(page)
    const dialog = await openCreateDialog(page)
    const createButton = dialog.getByRole('button', { name: 'Create robot', exact: true })

    await expect(createButton).toBeDisabled()
    await dialog.getByLabel('Robot name').fill(robotData.newRobot.name)
    await dialog.getByLabel('Serial number').fill(robotData.newRobot.serial_num)
    await dialog.getByLabel('IP address').fill(robotData.newRobot.ip_address)

    await expect(createButton).toBeEnabled()
  })

  test('keeps the dialog open and displays the API error for a duplicate serial number', async ({
    page,
  }) => {
    await setupRobotsPage(page)
    const dialog = await openCreateDialog(page)
    await fillValidRobot(dialog)

    const responsePromise = page.waitForResponse(API_BOTS)
    await dialog.getByRole('button', { name: 'Create robot', exact: true }).click()
    const response = await responsePromise

    expect(response.status()).toBe(409)
    await expect(page.getByText('A robot with this serial number already exists.')).toBeVisible()
    await expect(dialog).toBeVisible()
  })

  test('closes without creating a robot when cancelled or closed', async ({ page }) => {
    await setupRobotsPage(page)
    let dialog = await openCreateDialog(page)
    await dialog.getByLabel('Robot name').fill(robotData.newRobot.name)
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog).toHaveCount(0)

    dialog = await openCreateDialog(page)
    await dialog.getByRole('button', { name: 'Close' }).click()
    await expect(dialog).toHaveCount(0)
    await expect(page.getByText(robotData.newRobot.name, { exact: true })).toHaveCount(0)
  })

  test('creates a robot and renders it in the refreshed list', async ({ page }) => {
    await setupRobotsPage(page, (request) => {
      expect(request).toEqual({
        group_id: robotData.groupId,
        name: robotData.newRobot.name,
        serial_num: robotData.newRobot.serial_num,
        model: 'STANDARD',
        map_id: null,
        ip_address: robotData.newRobot.ip_address,
        tags: [],
      })
      return robotData.newRobot
    })
    const dialog = await openCreateDialog(page)
    await fillValidRobot(dialog)

    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/bots') && response.request().method() === 'POST',
    )
    await dialog.getByRole('button', { name: 'Create robot', exact: true }).click()
    const response = await responsePromise

    expect(response.status()).toBe(200)
    await expect(page.getByText('Robot created successfully.')).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByText(robotData.newRobot.name, { exact: true })).toBeVisible()
    await expect(page.getByText(robotData.newRobot.serial_num, { exact: true })).toBeVisible()
  })
})
