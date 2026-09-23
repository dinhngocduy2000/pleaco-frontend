import { expect, type Locator, type Page, test } from '@playwright/test'
import { DockingStationHeading, GeometryType, MapBoundarySource } from '@/enum/maps'
import type {
  ICreateEnvironmentZonesRequest,
  IDockingStationInfo,
  IMapDetailInfo,
  ISaveDockingStationsRequest,
  ISaveMapBoundaries,
} from '@/interface/maps'
import profileData from '../../data/profile.json' with { type: 'json' }
import { setupAuthenticatedPage } from '../../utils/setup-authenticated'

async function setup(
  page: Page,
  role: string,
  failFirst = false,
  saveGate?: Promise<void>,
  failFirstZone = false,
  initialDockingStations: IDockingStationInfo[] = [],
) {
  const profile = structuredClone(profileData.activeOwnerUser)
  profile.data.group.role = role
  await setupAuthenticatedPage(page, profile)
  const map: IMapDetailInfo = {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Adjustment warehouse',
    description: null,
    status: 'UNASSIGNED',
    tags: [],
    dimension_x: 20,
    dimension_y: 12,
    created_at: '2026-09-05T00:00:00Z',
    updated_at: '2026-09-05T00:00:00Z',
    boundary: {
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
    robots: [],
    zones: [],
    docking_stations: initialDockingStations,
  }
  const requests: ISaveMapBoundaries[] = []
  const zoneRequests: ICreateEnvironmentZonesRequest[] = []
  const stationRequests: ISaveDockingStationsRequest[] = []
  const createRequests: unknown[] = []
  const requestOrder: ('boundary' | 'zones' | 'stations')[] = []
  await page.route('**/api/v1/tags**', (route) =>
    route.fulfill({ json: { data: [], message: 'OK', statusCode: 200 } }),
  )
  await page.route('**/api/v1/maps**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: { data: map, message: 'OK', statusCode: 200 },
      })
    } else if (new URL(route.request().url()).pathname.endsWith('/boundary')) {
      const request = route.request().postDataJSON() as ISaveMapBoundaries
      requests.push(request)
      requestOrder.push('boundary')
      await saveGate
      if (failFirst && requests.length === 1) {
        await route.fulfill({ status: 422, json: { detail: 'Please retry boundary save.' } })
        return
      }
      map.boundary = request.geometry ?? {
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
    } else if (new URL(route.request().url()).pathname.endsWith('/zones')) {
      const request = route.request().postDataJSON() as ICreateEnvironmentZonesRequest
      zoneRequests.push(request)
      requestOrder.push('zones')
      if (failFirstZone && zoneRequests.length === 1) {
        await route.fulfill({ status: 400, json: { detail: 'Please retry zone save.' } })
        return
      }
      await route.fulfill({ status: 204 })
    } else if (new URL(route.request().url()).pathname.endsWith('/stations')) {
      const request = route.request().postDataJSON() as ISaveDockingStationsRequest
      stationRequests.push(request)
      requestOrder.push('stations')
      map.docking_stations = request.data.map((station, index) => ({
        id: station.id ?? `station-${index + 1}`,
        robot_id: station.robot_id ?? null,
        geometry: station.geometry,
        heading: station.heading ?? DockingStationHeading.SOUTH,
      }))
      await route.fulfill({
        json: { data: map.docking_stations, message: 'Saved', statusCode: 200 },
      })
    } else {
      createRequests.push(route.request().postDataJSON())
      await route.fulfill({ status: 400 })
    }
  })
  await page.goto(`/operations/maps/${map.id}`)
  await expect(page.getByText('Map Details')).toBeVisible()
  return { requests, zoneRequests, stationRequests, createRequests, requestOrder }
}

async function openEditor(page: Page) {
  await page.getByRole('button', { name: 'Adjust layout' }).click()
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

async function drawObstacleZone(page: Page, dialog: Locator) {
  await dialog.getByRole('button', { name: 'Obstacle' }).click()
  const canvas = dialog
    .getByRole('region', { name: 'Map boundary editor' })
    .locator('canvas')
    .last()
  await clickCanvasPoint(page, canvas, 60, 110)
  await clickCanvasPoint(page, canvas, 100, 110)
  await clickCanvasPoint(page, canvas, 80, 80)
  await clickCanvasPoint(page, canvas, 68, 110)
}

async function moveSavedBoundaryVertex(page: Page, dialog: Locator) {
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
}

for (const role of ['admin', 'owner']) {
  test(`${role} adjusts a saved vertex and reopens the persisted replacement`, async ({ page }) => {
    const { requests, createRequests } = await setup(page, role)
    let dialog = await openEditor(page)
    await expect(dialog.getByRole('combobox', { name: 'Boundary method' })).toContainText(
      'Draw a custom boundary',
    )
    // Konva uses a canvas; pointer coordinates are relative to its world-coordinate projection.
    await moveSavedBoundaryVertex(page, dialog)
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
    expect(requests).toHaveLength(1)
    expect(createRequests).toEqual([])
  })
}

for (const role of ['member', 'moderator', 'guest', '']) {
  test(`${role || 'unknown role'} cannot adjust boundaries`, async ({ page }) => {
    const { requests } = await setup(page, role)
    await expect(page.getByRole('button', { name: 'Adjust layout' })).not.toBeVisible()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    expect(requests).toEqual([])
  })
}

test('cancel discards edits; full-map replacement survives a failed save and retry', async ({
  page,
}) => {
  const { requests, createRequests } = await setup(page, 'owner', true)
  let dialog = await openEditor(page)
  await moveSavedBoundaryVertex(page, dialog)
  await expect(dialog.getByRole('button', { name: 'Clear', exact: true })).toBeEnabled()
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
  await moveSavedBoundaryVertex(page, dialog)
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

test('saves zones without resaving an unchanged boundary', async ({ page }) => {
  const { requests, zoneRequests, requestOrder } = await setup(page, 'owner')
  const dialog = await openEditor(page)
  await drawObstacleZone(page, dialog)

  await dialog.getByRole('button', { name: 'Save', exact: true }).click()

  await expect(page.getByText('Layout saved successfully.')).toBeVisible()
  await expect(dialog).not.toBeVisible()
  expect(requests).toHaveLength(0)
  expect(zoneRequests).toHaveLength(1)
  expect(requestOrder).toEqual(['zones'])
  expect(zoneRequests[0].map_id).toBe('00000000-0000-4000-8000-000000000001')
  expect(zoneRequests[0].zones).toHaveLength(1)
  expect(zoneRequests[0].zones[0].type).toBe('OBSTACLE')
  expect(zoneRequests[0].zones[0]).not.toHaveProperty('clientId')
  const ring = zoneRequests[0].zones[0].geometry.coordinates[0]
  expect(ring.at(-1)).toEqual(ring[0])
})

test('displays a persisted docking station and saves its deletion by omission', async ({
  page,
}) => {
  const persistedStation: IDockingStationInfo = {
    id: 'station-persisted',
    robot_id: 'robot-1',
    heading: DockingStationHeading.WEST,
    geometry: {
      type: GeometryType.POLYGON,
      coordinates: [
        [
          [5, 3],
          [7, 3],
          [7, 5],
          [5, 5],
          [5, 3],
        ],
      ],
    },
  }
  const { stationRequests, requestOrder } = await setup(page, 'owner', false, undefined, false, [
    persistedStation,
  ])
  const dialog = await openEditor(page)
  const toolbar = dialog.getByRole('toolbar', { name: 'Map layout tools' })
  await toolbar.getByRole('button', { name: 'Select', exact: true }).click()
  const deleteStation = toolbar.getByRole('button', { name: 'Delete selected zone' })
  await expect(deleteStation).toBeDisabled()

  const canvas = dialog
    .getByRole('region', { name: 'Map boundary editor' })
    .locator('canvas')
    .last()
  await clickCanvasPoint(page, canvas, 80, 100)
  await expect(deleteStation).toBeEnabled()
  await deleteStation.click()
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()

  await expect(page.getByText('Layout saved successfully.')).toBeVisible()
  await expect(dialog).not.toBeVisible()
  expect(stationRequests).toEqual([
    {
      map_id: '00000000-0000-4000-8000-000000000001',
      data: [],
    },
  ])
  expect(requestOrder).toEqual(['zones', 'stations'])
})

test('places and saves a docking station through the stations endpoint', async ({ page }) => {
  const { requests, stationRequests, requestOrder } = await setup(page, 'owner')
  const dialog = await openEditor(page)
  await dialog.getByRole('combobox', { name: 'Boundary method' }).click()
  await page.getByRole('option', { name: 'Use full map area' }).click()
  await dialog.getByRole('button', { name: 'Docking station', exact: true }).click()
  const canvas = dialog
    .getByRole('region', { name: 'Map boundary editor' })
    .locator('canvas')
    .last()
  await clickCanvasPoint(page, canvas, 120, 80)
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()

  await expect(page.getByText('Layout saved successfully.')).toBeVisible()
  await expect(dialog).not.toBeVisible()
  expect(requests).toEqual([
    {
      map_id: '00000000-0000-4000-8000-000000000001',
      source: MapBoundarySource.DIMENSIONS,
    },
  ])
  expect(stationRequests).toHaveLength(1)
  expect(stationRequests[0].map_id).toBe('00000000-0000-4000-8000-000000000001')
  expect(stationRequests[0].data).toHaveLength(1)
  expect(stationRequests[0].data[0]).toMatchObject({
    heading: DockingStationHeading.SOUTH,
    robot_id: null,
    geometry: { type: GeometryType.POLYGON },
  })
  expect(stationRequests[0].data[0]).not.toHaveProperty('id')
  const ring = stationRequests[0].data[0].geometry.coordinates[0]
  expect(ring).toHaveLength(5)
  expect(ring.at(-1)).toEqual(ring[0])
  expect(ring[1][0] - ring[0][0]).toBeCloseTo(4)
  expect(ring[2][1] - ring[1][1]).toBeCloseTo(4)
  expect(requestOrder).toEqual(['boundary', 'zones', 'stations'])
})

test('skips zone saving when the boundary request fails', async ({ page }) => {
  const { requests, zoneRequests, requestOrder } = await setup(page, 'owner', true)
  const dialog = await openEditor(page)
  await moveSavedBoundaryVertex(page, dialog)
  await drawObstacleZone(page, dialog)

  await dialog.getByRole('button', { name: 'Save', exact: true }).click()

  await expect(page.getByText('Please retry boundary save.')).toBeVisible()
  await expect(dialog).toBeVisible()
  expect(requests).toHaveLength(1)
  expect(zoneRequests).toEqual([])
  expect(requestOrder).toEqual(['boundary'])
})

test('keeps the layout open when zone saving fails', async ({ page }) => {
  const { requests, zoneRequests, requestOrder } = await setup(
    page,
    'owner',
    false,
    undefined,
    true,
  )
  const dialog = await openEditor(page)
  await drawObstacleZone(page, dialog)

  await dialog.getByRole('button', { name: 'Save', exact: true }).click()

  await expect(page.getByText('Please retry zone save.')).toBeVisible()
  await expect(dialog).toBeVisible()
  expect(requests).toHaveLength(0)
  expect(zoneRequests).toHaveLength(1)
  expect(requestOrder).toEqual(['zones'])

  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('Layout saved successfully.')).toBeVisible()
  await expect(dialog).not.toBeVisible()
  expect(requests).toHaveLength(0)
  expect(zoneRequests).toHaveLength(2)
  expect(requestOrder).toEqual(['zones', 'zones'])
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
  expect(requests).toHaveLength(0)
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
  expect(requests).toHaveLength(0)
})

test('restored zone conflicts show tooltips that follow zoom and scrolling', async ({ page }) => {
  await setup(page, 'owner')
  const dialog = await openEditor(page)
  await expect(dialog.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled()
  await expect(dialog.getByRole('button', { name: 'Clear', exact: true })).toBeDisabled()
  await drawObstacleZone(page, dialog)
  const region = dialog.getByRole('region', { name: 'Map boundary editor' })
  // Konva exposes its drawing surface through canvases, not individual DOM shapes.
  const canvas = region.locator('canvas').last()
  await dialog.getByRole('button', { name: 'Select', exact: true }).click()
  await clickCanvasPoint(page, canvas, 80, 100)
  await dialog.getByRole('button', { name: 'Delete selected zone' }).click()
  await dialog.getByRole('button', { name: 'Cleaning zone', exact: true }).click()
  await clickCanvasPoint(page, canvas, 60, 110)
  await clickCanvasPoint(page, canvas, 100, 110)
  await clickCanvasPoint(page, canvas, 80, 80)
  await clickCanvasPoint(page, canvas, 68, 110)
  await dialog.getByRole('button', { name: 'Obstacle', exact: true }).click()
  await dialog.getByRole('button', { name: 'Undo', exact: true }).click()
  const warnings = dialog.getByRole('button', {
    name: 'This zone overlaps or touches another zone.',
  })
  await expect(warnings).toHaveCount(2)
  await expect(dialog.getByRole('button', { name: 'Save', exact: true })).toBeDisabled()
  // Identical restored polygons have identical anchors; the topmost marker remains focusable.
  const marker = warnings.last()
  await marker.focus()
  await expect(page.getByRole('tooltip')).toHaveText('This zone overlaps or touches another zone.')
  await dialog.getByRole('button', { name: 'Zoom in', exact: true }).click()
  await expect(marker).toHaveCSS('left', '144px')
  await page.setViewportSize({ width: 640, height: 900 })
  await dialog.getByRole('button', { name: 'Zoom in', exact: true }).click()
  await dialog.getByRole('button', { name: 'Zoom in', exact: true }).click()
  await dialog.getByRole('button', { name: 'Zoom in', exact: true }).click()
  await expect(marker).toHaveCSS('left', '264px')
  await region.evaluate((element) => {
    element.scrollLeft = 0
  })
  const beforeScroll = await marker.boundingBox()
  await region.evaluate((element) => {
    element.scrollLeft = 40
  })
  await expect
    .poll(async () => {
      const afterScroll = await marker.boundingBox()
      return (beforeScroll?.x ?? 0) - (afterScroll?.x ?? 0)
    })
    .toBeCloseTo(40, 1)
  await marker.hover()
  await expect(page.getByRole('tooltip')).toBeVisible()
  await page.screenshot({ path: '/tmp/pleco-history-conflicts.png' })
  await dialog.getByRole('button', { name: 'Clear', exact: true }).click()
  await expect(warnings).toHaveCount(0)
  await expect(dialog.getByRole('button', { name: 'Save', exact: true })).toBeEnabled()
})
