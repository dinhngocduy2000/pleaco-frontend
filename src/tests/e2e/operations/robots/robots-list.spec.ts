import { expect, type Page, test } from '@playwright/test'
import profileData from '../../data/profile.json' with { type: 'json' }
import robotData from '../../data/robots.json' with { type: 'json' }
import { setupAuthenticatedPage } from '../../utils/setup-authenticated'

const ROBOTS_URL = '/operations/robots'
const API_BOTS = '**/api/v1/bots**'
const API_TAGS = '**/api/v1/tags**'

type Robot = (typeof robotData.initialRobots)[number]

const copyRobots = (): Robot[] =>
  robotData.initialRobots.map((robot) => ({
    ...robot,
    tags: robot.tags.map((tag) => ({ ...tag })),
  }))

function robotsForRequest(robots: Robot[], url: URL) {
  const search = url.searchParams.get('search')?.toLowerCase()
  const model = url.searchParams.get('model')
  const operationalStatus = url.searchParams.get('operational_status')
  const connectionStatus = url.searchParams.get('connection_status')
  const tagIds = url.searchParams.getAll('tag_ids')

  return robots
    .filter(
      (robot) =>
        !search ||
        robot.name.toLowerCase().includes(search) ||
        robot.serial_num.toLowerCase().includes(search),
    )
    .filter((robot) => !model || robot.model === model)
    .filter((robot) => !operationalStatus || robot.operational_status === operationalStatus)
    .filter((robot) => !connectionStatus || robot.connection_status === connectionStatus)
    .filter(
      (robot) =>
        tagIds.length === 0 || tagIds.every((tagId) => robot.tags.some((tag) => tag.id === tagId)),
    )
}

async function setupRobotsList(page: Page) {
  const robots = copyRobots()
  const listRequests: URL[] = []

  await setupAuthenticatedPage(page, profileData.activeOwnerUser)
  await page.route(API_TAGS, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: robotData.dropdowns.tags, message: 'Success', statusCode: 200 }),
    }),
  )
  await page.route(API_BOTS, (route) => {
    const requestUrl = new URL(route.request().url())
    const filteredRobots = robotsForRequest(robots, requestUrl)
    listRequests.push(requestUrl)
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: filteredRobots,
        page: 1,
        page_size: 10,
        total: filteredRobots.length,
        message: 'Success',
        statusCode: 200,
      }),
    })
  })

  await page.goto(ROBOTS_URL)
  await expect(page.getByRole('heading', { name: 'Robots' })).toBeVisible()
  await expect(page.getByText('Lobby Guardian', { exact: true })).toBeVisible()

  return { listRequests }
}

async function openFilters(page: Page) {
  await page.getByRole('button', { name: 'Filters' }).click()
  const sheet = page.getByRole('dialog', { name: 'Filter robots' })
  await expect(sheet).toBeVisible()
  return sheet
}

async function selectFilterOption(page: Page, filterName: string, optionName: string) {
  await page.getByRole('combobox', { name: filterName }).click()
  await page.getByRole('option', { name: optionName, exact: true }).click()
}

test.describe('Robot list', () => {
  test('displays each robot card with its operational information', async ({ page }) => {
    await setupRobotsList(page)

    await expect(page.getByText('Lobby Guardian', { exact: true })).toBeVisible()
    await expect(page.getByText('PL-2026-0001', { exact: true })).toBeVisible()
    await expect(page.getByText('PRO', { exact: true })).toBeVisible()
    await expect(page.getByText('Lobby map', { exact: true })).toBeVisible()
    await expect(page.getByText('192.168.1.10', { exact: true })).toBeVisible()
    await expect(page.getByText('Executing', { exact: true })).toBeVisible()
    await expect(page.getByText('Online', { exact: true })).toBeVisible()
    await expect(page.getByText('Lobby', { exact: true })).toBeVisible()
    await expect(page.getByText('No map assigned', { exact: true })).toHaveCount(2)
    await expect(page.getByText('Connection delayed', { exact: true })).toBeVisible()
    await expect(page.getByText('Offline', { exact: true })).toBeVisible()
  })

  test('searches robots by name and sends the search parameter to the list endpoint', async ({
    page,
  }) => {
    const { listRequests } = await setupRobotsList(page)
    const searchResponse = page.waitForResponse((response) => {
      const url = new URL(response.url())
      return url.pathname.endsWith('/bots') && url.searchParams.get('search') === 'night'
    })

    await page
      .getByRole('textbox', { name: 'Search robots by name or serial number' })
      .fill('night')
    await searchResponse

    await expect(page.getByText('Night Runner', { exact: true })).toBeVisible()
    await expect(page.getByText('Lobby Guardian', { exact: true })).toHaveCount(0)
    expect(listRequests.at(-1)?.searchParams.get('search')).toBe('night')
  })

  test('filters robots by model, operational status, connection status, and tags', async ({
    page,
  }) => {
    await setupRobotsList(page)
    const sheet = await openFilters(page)

    await selectFilterOption(page, 'Model', 'Lite')
    await selectFilterOption(page, 'Operational status', 'Charging')
    await selectFilterOption(page, 'Connection status', 'Stale')
    await selectFilterOption(page, 'Tags', 'Night shift')

    const filteredResponse = page.waitForResponse((response) => {
      const url = new URL(response.url())
      return (
        url.pathname.endsWith('/bots') &&
        url.searchParams.get('model') === 'LITE' &&
        url.searchParams.get('operational_status') === 'CHARGING' &&
        url.searchParams.get('connection_status') === 'STALE' &&
        url.searchParams.get('tag_ids') === robotData.dropdowns.tags[1].id
      )
    })
    await sheet.getByRole('button', { name: 'Apply filters' }).click()
    await filteredResponse

    await expect(page.getByText('Night Runner', { exact: true })).toBeVisible()
    await expect(page.getByText('Lobby Guardian', { exact: true })).toHaveCount(0)
    const search = new URL(page.url()).searchParams
    expect(search.get('model')).toBe('LITE')
    expect(search.get('operational_status')).toBe('CHARGING')
    expect(search.get('connection_status')).toBe('STALE')
    expect(search.get('tag_ids')).toBe(JSON.stringify([robotData.dropdowns.tags[1].id]))
  })

  test('resets applied filters and restores the complete robot list', async ({ page }) => {
    await setupRobotsList(page)
    const sheet = await openFilters(page)
    await selectFilterOption(page, 'Model', 'Lite')
    await sheet.getByRole('button', { name: 'Apply filters' }).click()
    await expect(page.getByText('Night Runner', { exact: true })).toBeVisible()
    await expect(page.getByText('Lobby Guardian', { exact: true })).toHaveCount(0)

    await page.getByRole('button', { name: 'Filters' }).click()
    await page
      .getByRole('dialog', { name: 'Filter robots' })
      .getByRole('button', { name: 'Reset' })
      .click()

    await expect(page.getByText('Lobby Guardian', { exact: true })).toBeVisible()
    await expect(page.getByText('Night Runner', { exact: true })).toBeVisible()
    await expect(page.getByText('Offline Scout', { exact: true })).toBeVisible()
    expect(new URL(page.url()).searchParams.has('model')).toBe(false)
  })
})
