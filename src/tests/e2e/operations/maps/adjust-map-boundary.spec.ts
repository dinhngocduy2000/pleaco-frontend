import { expect, type Locator, type Page, test } from '@playwright/test'
import { GeometryType, MapBoundarySource } from '@/enum/maps'
import type { IMapListInfo, ISaveMapBoundaries } from '@/interface/maps'
import profileData from '../../data/profile.json' with { type: 'json' }
import { setupAuthenticatedPage } from '../../utils/setup-authenticated'

async function setup(page: Page, role: string, failFirst = false, saveGate?: Promise<void>) {
  const profile = structuredClone(profileData.activeOwnerUser)
  profile.data.group.role = role
  await setupAuthenticatedPage(page, profile)
  const map: IMapListInfo = {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Adjustment warehouse',
    description: null,
    status: 'UNASSIGNED',
    tags: [],
    dimension_x: 20,
    dimension_y: 12,
    updated_at: '2026-09-05T00:00:00Z',
    geometry: {
      type: GeometryType.POLYGON,
      coordinates: [
        [
          [2, 2],
          [10, 2],
          [6, 8],
          [2, 2],
        ],
      ],
    },
  }
  const requests: ISaveMapBoundaries[] = []
  const createRequests: unknown[] = []
  await page.route('**/api/v1/tags**', (route) =>
    route.fulfill({ json: { data: [], message: 'OK', statusCode: 200 } }),
  )
  await page.route('**/api/v1/maps**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: { items: [map], page: 1, page_size: 10, total: 1, message: 'OK', statusCode: 200 },
      })
    } else if (new URL(route.request().url()).pathname.endsWith('/boundary')) {
      const request = route.request().postDataJSON() as ISaveMapBoundaries
      requests.push(request)
      await saveGate
      if (failFirst && requests.length === 1) {
        await route.fulfill({ status: 422, json: { detail: 'Please retry boundary save.' } })
        return
      }
      map.geometry = request.geometry ?? {
        type: GeometryType.POLYGON,
        coordinates: [
          [
            [0, 0],
            [20, 0],
            [20, 12],
            [0, 12],
            [0, 0],
          ],
        ],
      }
      await route.fulfill({ status: 204 })
    } else {
      createRequests.push(route.request().postDataJSON())
      await route.fulfill({ status: 400 })
    }
  })
  await page.goto('/operations/maps')
  const card = page.getByRole('article', { name: map.name })
  await expect(card).toBeVisible()
  return { requests, createRequests, card }
}

async function openEditor(page: Page) {
  await page
    .getByRole('article', { name: 'Adjustment warehouse' })
    .getByRole('button', { name: 'Map options' })
    .click()
  await page.getByRole('menuitem', { name: 'Adjust layout' }).click()
  const dialog = page
    .getByRole('dialog')
    .filter({ has: page.getByRole('heading', { name: 'Adjust layout' }) })
  await expect(dialog.getByRole('heading', { name: 'Adjust layout' })).toBeVisible()
  await dialog.evaluate(async (element) => {
    await Promise.allSettled(
      element.getAnimations({ subtree: true }).map((animation) => animation.finished),
    )
  })
  return dialog
}

async function clickCanvasPoint(page: Page, canvas: Locator, x: number, y: number) {
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Boundary canvas is missing')
  await page.mouse.click(box.x + x, box.y + y)
}

for (const role of ['admin', 'owner']) {
  test(`${role} adjusts a saved vertex and reopens the persisted replacement`, async ({ page }) => {
    const { requests, createRequests } = await setup(page, role)
    let dialog = await openEditor(page)
    await expect(dialog.getByRole('combobox', { name: 'Boundary method' })).toContainText(
      'Draw a custom boundary',
    )
    // Konva uses a canvas; pointer coordinates are relative to its world-coordinate projection.
    const canvas = dialog
      .getByRole('region', { name: 'Map boundary editor' })
      .locator('canvas')
      .last()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Boundary canvas is missing')
    await page.mouse.move(box.x + 40, box.y + 120)
    await page.mouse.down()
    await page.mouse.move(box.x + 50, box.y + 110, { steps: 5 })
    await page.mouse.up()
    await dialog.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(dialog).not.toBeVisible()
    expect(requests).toHaveLength(1)
    expect(requests[0].map_id).toBe('00000000-0000-4000-8000-000000000001')
    expect(requests[0].source).toBe(MapBoundarySource.CUSTOM)
    expect(requests[0].geometry?.coordinates[0][0][0]).toBeCloseTo(3, 1)
    expect(requests[0].geometry?.coordinates[0]).toHaveLength(4)
    dialog = await openEditor(page)
    await dialog.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(dialog).not.toBeVisible()
    expect(requests[1]).toEqual(requests[0])
    expect(createRequests).toEqual([])
  })
}

for (const role of ['member', 'moderator', 'guest', '']) {
  test(`${role || 'unknown role'} cannot adjust boundaries`, async ({ page }) => {
    const { card, requests } = await setup(page, role)
    await card.getByRole('button', { name: 'Map options' }).click()
    const action = page.getByRole('menuitem', { name: 'Adjust layout' })
    await expect(action).toBeDisabled()
    await page.keyboard.press('a')
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog')).not.toBeVisible()
    expect(requests).toEqual([])
  })
}

test('cancel discards edits; full-map replacement survives a failed save and retry', async ({
  page,
}) => {
  const { requests, createRequests } = await setup(page, 'owner', true)
  let dialog = await openEditor(page)
  await dialog.getByRole('button', { name: 'Clear', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Save', exact: true })).toBeDisabled()
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  dialog = await openEditor(page)
  await expect(dialog.getByRole('button', { name: 'Save', exact: true })).toBeEnabled()
  expect(requests).toEqual([])
  await dialog.getByRole('combobox', { name: 'Boundary method' }).click()
  await page.getByRole('option', { name: 'Use full map area' }).click()
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('Please retry boundary save.')).toBeVisible()
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  expect(requests).toEqual(
    Array(2).fill({ map_id: '00000000-0000-4000-8000-000000000001', source: 'DIMENSIONS' }),
  )
  expect(createRequests).toEqual([])
})

test('saving blocks dismissal and duplicate requests', async ({ page }) => {
  let releaseSave = () => {}
  const saveGate = new Promise<void>((resolve) => {
    releaseSave = resolve
  })
  const { requests } = await setup(page, 'owner', false, saveGate)
  const dialog = await openEditor(page)
  try {
    await dialog.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(dialog.getByRole('button', { name: /^Save/ })).toBeDisabled()
    await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled()
    await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeDisabled()
    await page.keyboard.press('Escape')
    await page.mouse.click(1, 1)
    await expect(dialog).toBeVisible()
    expect(requests).toHaveLength(1)
  } finally {
    releaseSave()
  }
  await expect(dialog).not.toBeVisible()
})

test('draws, selects, and deletes a session-only zone with layout tools', async ({ page }) => {
  const { requests } = await setup(page, 'owner')
  const dialog = await openEditor(page)
  const toolbar = dialog.getByRole('toolbar', { name: 'Map layout tools' })
  await expect(toolbar).toBeVisible()
  await expect(toolbar.getByRole('button', { name: 'Boundary' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  for (const name of ['Obstacle', 'No-go', 'Cleaning zone', 'Select']) {
    await expect(toolbar.getByRole('button', { name, exact: true })).toBeVisible()
  }

  await toolbar.getByRole('button', { name: 'Obstacle' }).click()
  await expect(dialog.getByRole('combobox', { name: 'Boundary method' })).toBeDisabled()
  const canvas = dialog
    .getByRole('region', { name: 'Map boundary editor' })
    .locator('canvas')
    .last()
  await clickCanvasPoint(page, canvas, 30, 130)
  await expect(dialog.getByText(/Zones must form a valid polygon/)).toBeVisible()

  await clickCanvasPoint(page, canvas, 60, 110)
  await clickCanvasPoint(page, canvas, 100, 110)
  await clickCanvasPoint(page, canvas, 80, 80)
  await clickCanvasPoint(page, canvas, 68, 110)
  await expect(dialog.getByRole('button', { name: 'Undo' })).toBeEnabled()

  await toolbar.getByRole('button', { name: 'Select', exact: true }).click()
  const deleteZone = toolbar.getByRole('button', { name: 'Delete selected zone' })
  await expect(deleteZone).toBeDisabled()
  await clickCanvasPoint(page, canvas, 80, 100)
  await expect(deleteZone).toBeEnabled()
  await deleteZone.click()
  await expect(deleteZone).toBeDisabled()

  await toolbar.getByRole('button', { name: 'Boundary' }).click()
  await expect(dialog.getByRole('combobox', { name: 'Boundary method' })).toBeEnabled()
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  expect(requests).toHaveLength(1)
  expect(requests[0]).toEqual({
    map_id: '00000000-0000-4000-8000-000000000001',
    source: MapBoundarySource.CUSTOM,
    geometry: {
      type: GeometryType.POLYGON,
      coordinates: [
        [
          [2, 2],
          [10, 2],
          [6, 8],
          [2, 2],
        ],
      ],
    },
  })
})

test('preserves an open zone draft and blocks the boundary request until it is cleared', async ({
  page,
}) => {
  const { requests } = await setup(page, 'owner')
  const dialog = await openEditor(page)
  const toolbar = dialog.getByRole('toolbar', { name: 'Map layout tools' })
  await toolbar.getByRole('button', { name: 'No-go' }).click()
  const canvas = dialog
    .getByRole('region', { name: 'Map boundary editor' })
    .locator('canvas')
    .last()
  await clickCanvasPoint(page, canvas, 60, 110)

  await toolbar.getByRole('button', { name: 'Cleaning zone' }).click()
  await toolbar.getByRole('button', { name: 'No-go' }).click()
  await expect(dialog.getByText('1 polygon points')).toBeVisible()
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('Finish or clear every open polygon before saving.')).toBeVisible()
  expect(requests).toEqual([])

  await dialog.getByRole('button', { name: 'Clear', exact: true }).click()
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  expect(requests).toHaveLength(1)
})
