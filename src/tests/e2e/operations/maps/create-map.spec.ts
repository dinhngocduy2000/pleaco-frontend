import { expect, type Locator, type Page, test } from '@playwright/test'
import mapData from '../../data/maps.json' with { type: 'json' }
import profileData from '../../data/profile.json' with { type: 'json' }
import tagData from '../../data/tags.json' with { type: 'json' }
import { setupAuthenticatedPage } from '../../utils/setup-authenticated'

const MAPS_URL = '/operations/maps'
const API_MAPS = '**/api/v1/maps**'
const API_ROBOTS_KEY_VALUE = '**/api/v1/bots/key-value'
const API_TAGS = '**/api/v1/tags**'

type Tag = (typeof tagData.tags)[number]

type MapItem = {
  id: string
  name: string
  description: string | null
  status: 'ASSIGNED' | 'UNASSIGNED'
  dimension_x: number
  dimension_y: number
  updated_at: string
  tags: Tag[]
}

type CreateMapRequest = {
  group_id: string
  name: string
  description?: string
  dimension_x: number
  dimension_y: number
  robot_ids: string[]
  tags: string[]
}

type MapsPageOptions = {
  createError?: string
}

const copyMaps = (): MapItem[] =>
  mapData.initialMaps.map((map) => ({
    ...map,
    status: map.status as MapItem['status'],
    tags: [],
  }))

async function setupMapsPage(page: Page, options: MapsPageOptions = {}) {
  const maps = copyMaps()
  const createRequests: CreateMapRequest[] = []

  await setupAuthenticatedPage(page, profileData.activeOwnerUser)
  await page.route(API_TAGS, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: tagData.tags, message: 'Success', statusCode: 200 }),
    }),
  )
  await page.route(API_ROBOTS_KEY_VALUE, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: mapData.robots, message: 'Success', statusCode: 200 }),
    }),
  )
  await page.route(API_MAPS, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: maps,
          page: 1,
          page_size: 10,
          total: maps.length,
          message: 'Success',
          statusCode: 200,
        }),
      })
      return
    }

    const request = route.request().postDataJSON() as CreateMapRequest
    createRequests.push(request)

    if (options.createError) {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ detail: options.createError }),
      })
      return
    }

    maps.unshift({
      ...mapData.newMap,
      status: request.robot_ids.length > 0 ? 'ASSIGNED' : 'UNASSIGNED',
      tags: tagData.tags.filter((tag) => request.tags.includes(tag.id)),
    })
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: null, message: 'Success', statusCode: 200 }),
    })
  })

  await page.goto(MAPS_URL)
  await expect(page.getByRole('heading', { name: 'Maps' })).toBeVisible()
  await expect(page.getByRole('article', { name: mapData.initialMaps[0].name })).toBeVisible()

  return { createRequests }
}

async function openCreateDialog(page: Page) {
  await page.getByRole('button', { name: 'Create map', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Create map' })).toBeVisible()
  return dialog
}

async function fillRequiredMapFields(dialog: Locator) {
  await dialog.getByLabel('Map name').fill(mapData.newMap.name)
  await dialog.getByLabel('Width').fill(String(mapData.newMap.dimension_x))
  await dialog.getByLabel('Height').fill(String(mapData.newMap.dimension_y))
}

async function selectOption(page: Page, dialog: Locator, fieldName: string, optionName: string) {
  await dialog
    .getByTestId('select-trigger')
    .filter({ hasText: fieldName === 'Assign robots' ? 'No robots available' : 'Select tags' })
    .click()
  await page.getByRole('option', { name: optionName }).click()
  await page.keyboard.press('Escape')
}

async function expectCanvasSize(preview: Locator, width: number, height: number) {
  const canvases = preview.locator('canvas')
  await expect(canvases).toHaveCount(1)
  await expect
    .poll(() =>
      canvases.evaluateAll((elements) =>
        elements.map((canvas) => ({
          height: canvas.style.height,
          width: canvas.style.width,
        })),
      ),
    )
    .toEqual([{ height: `${height}px`, width: `${width}px` }])
}

test.describe('Create map', () => {
  test('shows inline errors and enables creation only for valid required values', async ({
    page,
  }) => {
    await setupMapsPage(page)
    const dialog = await openCreateDialog(page)
    const createButton = dialog.getByRole('button', { name: 'Create map', exact: true })

    await expect(createButton).toBeDisabled()
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeEnabled()
    await expect(dialog.getByRole('button', { name: 'Close' })).toBeEnabled()

    await dialog.getByLabel('Map name').fill(' ')
    await dialog.getByLabel('Width').fill('0')
    await dialog.getByLabel('Height').fill('-2')

    await expect(dialog.getByText('Map name is required')).toBeVisible()
    await expect(dialog.getByText('Enter a positive number')).toHaveCount(2)
    await expect(createButton).toBeDisabled()

    await fillRequiredMapFields(dialog)

    await expect(dialog.getByText('Map name is required')).toHaveCount(0)
    await expect(dialog.getByText('Enter a positive number')).toHaveCount(0)
    await expect(createButton).toBeEnabled()
  })

  test('renders preview coordinates from dimensions and enforces zoom button limits', async ({
    page,
  }) => {
    await setupMapsPage(page)
    const dialog = await openCreateDialog(page)

    await expect(
      dialog.getByText('Enter positive width and height to preview the map.'),
    ).toBeVisible()
    await dialog.getByLabel('Width').fill('20')
    await dialog.getByLabel('Height').fill('12')

    const preview = dialog.getByRole('region', { name: 'Map grid preview' })
    await expect(preview).toBeVisible()
    await expectCanvasSize(preview, 240, 160)

    await dialog.getByLabel('Width').fill('25')
    await dialog.getByLabel('Height').fill('10')
    await expectCanvasSize(preview, 290, 140)

    const zoomIn = dialog.getByRole('button', { name: 'Zoom in' })
    const zoomOut = dialog.getByRole('button', { name: 'Zoom out' })
    await expect(zoomIn).toBeEnabled()
    await expect(zoomOut).toBeEnabled()

    await zoomOut.click()
    await expect(dialog.getByText('0.5×')).toBeVisible()
    await expect(zoomOut).toBeDisabled()

    for (let click = 0; click < 5; click += 1) await zoomIn.click()
    await expect(dialog.getByText('3.0×')).toBeVisible()
    await expect(zoomIn).toBeDisabled()
  })

  test('creates an assigned map and renders its metadata in the refreshed list', async ({
    page,
  }) => {
    const { createRequests } = await setupMapsPage(page)
    const dialog = await openCreateDialog(page)
    await fillRequiredMapFields(dialog)
    await dialog.getByLabel('Description').fill(mapData.newMap.description)
    await selectOption(page, dialog, 'Assign robots', mapData.robots[0].label)
    await selectOption(page, dialog, 'Tags', tagData.tags[0].name)

    const createResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/maps') && response.request().method() === 'POST',
    )
    await dialog.getByRole('button', { name: 'Create map', exact: true }).click()
    expect((await createResponse).status()).toBe(200)

    expect(createRequests).toEqual([
      {
        group_id: mapData.groupId,
        name: mapData.newMap.name,
        description: mapData.newMap.description,
        dimension_x: mapData.newMap.dimension_x,
        dimension_y: mapData.newMap.dimension_y,
        robot_ids: [mapData.robots[0].value],
        tags: [tagData.tags[0].id],
      },
    ])
    await expect(page.getByText('Map created successfully.')).toBeVisible()
    await expect(dialog).toHaveCount(0)

    const card = page.getByRole('article', { name: mapData.newMap.name })
    await expect(card).toBeVisible()
    await expect(card.getByRole('heading', { name: mapData.newMap.name })).toBeVisible()
    await expect(card.getByText(mapData.newMap.description)).toBeVisible()
    await expect(
      card.getByText(`${mapData.newMap.dimension_x} × ${mapData.newMap.dimension_y}`),
    ).toBeVisible()
    await expect(card.getByText(tagData.tags[0].name, { exact: true })).toBeVisible()
    await expect(card.getByText('ASSIGNED', { exact: true })).toBeVisible()
    await expect(card.getByText(/^Updated /)).toBeVisible()
    await expect(card.getByRole('region', { name: 'Map grid preview' })).toBeVisible()
  })

  test('shows the API error and keeps the modal open when creation fails', async ({ page }) => {
    const errorMessage = 'A map with this name already exists.'
    await setupMapsPage(page, { createError: errorMessage })
    const dialog = await openCreateDialog(page)
    await fillRequiredMapFields(dialog)

    const createResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/v1/maps') && response.request().method() === 'POST',
    )
    await dialog.getByRole('button', { name: 'Create map', exact: true }).click()
    expect((await createResponse).status()).toBe(409)

    await expect(page.getByText(errorMessage)).toBeVisible()
    await expect(dialog).toBeVisible()
    await expect(page.getByRole('article', { name: mapData.newMap.name })).toHaveCount(0)
  })
})
