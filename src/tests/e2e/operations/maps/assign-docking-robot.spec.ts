import { expect, type Locator, type Page, test } from '@playwright/test'
import { DockingStationHeading, GeometryType, MapZoneType } from '@/enum/maps'
import type { Geometry, IMapDetailInfo, ISaveMapLayoutRequest } from '@/interface/maps'
import profileData from '../../data/profile.json' with { type: 'json' }
import { setupAuthenticatedPage } from '../../utils/setup-authenticated'

const MAP_ID = '00000000-0000-4000-8000-000000000101'
const DOCK_ID = '00000000-0000-4000-8000-000000000201'
const ROBOT_IDS = [
  '00000000-0000-4000-8000-000000000301',
  '00000000-0000-4000-8000-000000000302',
  '00000000-0000-4000-8000-000000000303',
]

function rectangle(x: number, y: number, width: number, height: number): Geometry {
  return {
    type: GeometryType.POLYGON,
    coordinates: [
      [
        [x, y],
        [x + width, y],
        [x + width, y + height],
        [x, y + height],
        [x, y],
      ],
    ],
  }
}

async function setup(page: Page, role: string) {
  const profile = structuredClone(profileData.activeOwnerUser)
  profile.data.group.role = role
  await setupAuthenticatedPage(page, profile)
  const map: IMapDetailInfo = {
    id: MAP_ID,
    name: 'Dock assignment warehouse',
    description: null,
    status: 'ASSIGNED',
    tags: [],
    dimension_x: 20,
    dimension_y: 12,
    created_at: '2026-09-05T00:00:00Z',
    updated_at: '2026-09-05T00:00:00Z',
    boundary: rectangle(0, 0, 20, 12),
    zones: [{ id: 'obstacle-1', type: MapZoneType.OBSTACLE, geometry: rectangle(5, 5, 2, 2) }],
    docking_stations: [
      {
        id: DOCK_ID,
        robot_id: null,
        heading: DockingStationHeading.SOUTH,
        geometry: rectangle(0, 0, 2, 2),
      },
      {
        id: '00000000-0000-4000-8000-000000000202',
        robot_id: ROBOT_IDS[2],
        heading: DockingStationHeading.NORTH,
        geometry: rectangle(18, 10, 2, 2),
      },
    ],
    robots: ['Atlas', 'Nova', 'Already docked'].map((name, index) => ({
      id: ROBOT_IDS[index],
      name,
      serial_num: `PLC-PRO-${index + 1}`,
      model: 'PRO',
      connection_status: 'ONLINE',
      operational_status: 'IDLE',
    })),
  }
  const assignments: { robot_id: string }[] = []
  const layouts: ISaveMapLayoutRequest[] = []
  let detailRequests = 0
  await page.route('**/api/v1/tags**', (route) =>
    route.fulfill({ json: { data: [], message: 'OK', statusCode: 200 } }),
  )
  await page.route(`**/api/v1/maps/${MAP_ID}`, (route) => {
    detailRequests += 1
    return route.fulfill({ json: { data: map, message: 'OK', statusCode: 200 } })
  })
  await page.route(`**/api/v1/maps/${MAP_ID}/docking/${DOCK_ID}/`, (route) => {
    expect(route.request().method()).toBe('PUT')
    const body = route.request().postDataJSON() as { robot_id: string }
    assignments.push(body)
    map.docking_stations[0].robot_id = body.robot_id
    return route.fulfill({ status: 204 })
  })
  await page.route('**/api/v1/maps/layouts', (route) => {
    const body = route.request().postDataJSON() as ISaveMapLayoutRequest
    layouts.push(body)
    if (body.docking_stations) {
      map.docking_stations = body.docking_stations.map((station, index) => ({
        ...station,
        id: station.id ?? `created-station-${index}`,
        robot_id: station.robot_id ?? null,
        heading: station.heading ?? DockingStationHeading.SOUTH,
      }))
    }
    return route.fulfill({ status: 204 })
  })
  await page.goto(`/operations/maps/${MAP_ID}`)
  await expect(page.getByRole('heading', { level: 3, name: map.name, exact: true })).toBeVisible()
  return { assignments, layouts, getDetailRequests: () => detailRequests }
}

class DockingMapPage {
  constructor(private readonly page: Page) {}

  async clickWorldPoint(region: Locator, x: number, y: number, button: 'left' | 'right' = 'left') {
    // Konva shapes are not DOM elements. Project world coordinates onto the top canvas layer.
    const canvas = region.locator('canvas').last()
    await expect(canvas).toBeVisible()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Map canvas is missing')
    const padding = 20
    const pixelsPerMeter = (box.width - padding * 2) / 20
    await this.page.mouse.click(
      box.x + padding + x * pixelsPerMeter,
      box.y + padding + (12 - y) * pixelsPerMeter,
      { button },
    )
  }

  async openDockMenu() {
    await this.clickWorldPoint(
      this.page.getByRole('region', { name: 'Map boundary editor' }),
      1,
      1,
      'right',
    )
    await expect(this.page.getByRole('menuitem', { name: 'Edit', exact: true })).toBeVisible()
  }

  async editDock() {
    await this.openDockMenu()
    await this.page.getByRole('menuitem', { name: 'Edit', exact: true }).click()
    const dialog = this.page
      .getByRole('dialog')
      .filter({ has: this.page.getByRole('heading', { name: 'Adjust layout', exact: true }) })
    await expect(dialog).toBeVisible()
    await dialog.evaluate(async (element) => {
      await Promise.allSettled(
        element.getAnimations({ subtree: true }).map((animation) => animation.finished),
      )
    })
    return dialog
  }
}

for (const role of ['owner', 'admin']) {
  test(`${role} assigns one robot from the map and retains it during a later layout save`, async ({
    page,
  }) => {
    const state = await setup(page, role)
    const mapPage = new DockingMapPage(page)

    const initialEditor = await mapPage.editDock()
    await expect(
      initialEditor.getByRole('button', { name: 'Select', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(initialEditor.getByRole('button', { name: 'Delete selected zone' })).toBeEnabled()
    await initialEditor.getByRole('button', { name: 'Cancel', exact: true }).click()

    await mapPage.openDockMenu()
    await page.getByRole('menuitem', { name: 'Assign robot', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Assign robot', exact: true })
    const atlas = dialog.getByRole('button', { name: /Atlas/ })
    const nova = dialog.getByRole('button', { name: /Nova/ })
    await expect(dialog.getByRole('button', { name: /Already docked/ })).toBeDisabled()
    await expect(dialog.getByRole('button', { name: 'Save', exact: true })).toBeDisabled()
    await atlas.click()
    await expect(atlas).toHaveAttribute('aria-pressed', 'true')
    await nova.focus()
    await page.keyboard.press('Space')
    await expect(nova).toHaveAttribute('aria-pressed', 'true')
    await expect(atlas).toHaveAttribute('aria-pressed', 'false')
    const selectedBorderColor = await nova.evaluate((element) => {
      // Resolve the theme token through CSSOM so browsers normalize oklch percentages equally.
      const reference = document.createElement('span')
      reference.style.color = getComputedStyle(element).getPropertyValue('--color-green-600')
      document.body.append(reference)
      const color = getComputedStyle(reference).color
      reference.remove()
      return color
    })
    await expect(nova).toHaveCSS('border-color', selectedBorderColor)

    const requestsBeforeSave = state.getDetailRequests()
    await dialog.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(dialog).not.toBeVisible()
    expect(state.assignments).toEqual([{ robot_id: ROBOT_IDS[1] }])
    expect(state.getDetailRequests()).toBeGreaterThan(requestsBeforeSave)
    await mapPage.openDockMenu()
    await expect(page.getByRole('menuitem', { name: 'Assign robot', exact: true })).toBeDisabled()
    await page.keyboard.press('Escape')

    const editor = await mapPage.editDock()
    await expect(editor.getByRole('button', { name: 'Delete selected zone' })).toBeEnabled()
    await editor.getByRole('button', { name: 'Docking station', exact: true }).click()
    await mapPage.clickWorldPoint(
      editor.getByRole('region', { name: 'Map boundary editor' }),
      19,
      6,
    )
    await editor.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(editor).not.toBeVisible()
    expect(state.layouts).toHaveLength(1)
    expect(state.layouts[0].docking_stations).toHaveLength(3)
    expect(state.layouts[0].docking_stations).toContainEqual(
      expect.objectContaining({ id: DOCK_ID, robot_id: ROBOT_IDS[1] }),
    )
  })
}

test('does not expose docking actions for a member or a non-docking zone', async ({ page }) => {
  const state = await setup(page, 'member')
  const mapPage = new DockingMapPage(page)
  const region = page.getByRole('region', { name: 'Map boundary editor' })
  await mapPage.clickWorldPoint(region, 1, 1, 'right')
  await expect(page.getByRole('menu')).not.toBeVisible()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await mapPage.clickWorldPoint(region, 6, 6, 'right')
  await expect(page.getByRole('menu')).not.toBeVisible()
  expect(state.assignments).toEqual([])
})

test('only docking stations offer the zone context menu to an owner', async ({ page }) => {
  await setup(page, 'owner')
  const mapPage = new DockingMapPage(page)
  const region = page.getByRole('region', { name: 'Map boundary editor' })
  await mapPage.clickWorldPoint(region, 6, 6, 'right')
  await expect(page.getByRole('menu')).not.toBeVisible()
  await mapPage.openDockMenu()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).not.toBeVisible()
})

test('keeps the selected robot after a failed save and allows retry', async ({ page }) => {
  const state = await setup(page, 'owner')
  let failed = false
  await page.route(`**/api/v1/maps/${MAP_ID}/docking/${DOCK_ID}/`, (route) => {
    if (!failed) {
      failed = true
      return route.fulfill({ status: 400, json: { detail: 'Assignment could not be saved.' } })
    }
    return route.fallback()
  })
  const mapPage = new DockingMapPage(page)
  await mapPage.openDockMenu()
  await page.getByRole('menuitem', { name: 'Assign robot', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Assign robot', exact: true })
  const robot = dialog.getByRole('button', { name: /Atlas/ })
  await robot.click()
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('Assignment could not be saved.')).toBeVisible()
  await expect(dialog).toBeVisible()
  await expect(robot).toHaveAttribute('aria-pressed', 'true')
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  expect(state.assignments).toEqual([{ robot_id: ROBOT_IDS[0] }])
})
