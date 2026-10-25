import { expect, type Page, test } from '@playwright/test'
import { DockingStationHeading, GeometryType, MapStatus } from '@/enum/maps'
import { ROBOT_CONNECTION_STATUS, ROBOT_OPERATION_STATUS, RobotModel } from '@/enum/robot'
import type { IMapDetailInfo } from '@/interface/maps'
import profileData from '../../data/profile.json' with { type: 'json' }
import { API_PROFILE, setupAuthenticatedPage } from '../../utils/setup-authenticated'

const mapId = '00000000-0000-4000-8000-000000000021'
const stationId = '00000000-0000-4000-8000-000000000022'
const robotId = '00000000-0000-4000-8000-000000000023'

async function setup(page: Page, role: string) {
  const profile = structuredClone(profileData.activeOwnerUser)
  profile.data.group.role = role
  await setupAuthenticatedPage(page, profile)

  const map: IMapDetailInfo = {
    id: mapId,
    name: 'Docking station assignment map',
    description: null,
    status: MapStatus.ASSIGNED,
    dimension_x: 20,
    dimension_y: 12,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
    tags: [],
    boundary: {
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
    },
    zones: [],
    docking_stations: [
      {
        id: stationId,
        robot_id: null,
        heading: DockingStationHeading.NORTH,
        geometry: {
          type: GeometryType.POLYGON,
          coordinates: [
            [
              [9, 4],
              [11, 4],
              [11, 6],
              [9, 6],
              [9, 4],
            ],
          ],
        },
      },
    ],
    robots: [
      {
        id: robotId,
        name: 'Atlas 21',
        serial_num: 'PLC-PRO-00021',
        model: RobotModel.PRO,
        connection_status: ROBOT_CONNECTION_STATUS.ONLINE,
        operational_status: ROBOT_OPERATION_STATUS.IDLE,
      },
    ],
  }

  const requests: { method: string; url: string; body?: unknown }[] = []
  let detailReads = 0
  await page.route(API_PROFILE, (route) =>
    route.fulfill({
      json: {
        ...profile,
        data: {
          ...profile.data,
          group: { ...profile.data.group, role },
        },
      },
    }),
  )
  await page.route('**/api/v1/maps/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    requests.push({
      method: request.method(),
      url: url.pathname,
      body: request.postData() ? (request.postDataJSON() as unknown) : undefined,
    })

    if (
      request.method() === 'PUT' &&
      url.pathname === `/api/v1/maps/${mapId}/docking/${stationId}/`
    ) {
      const body = request.postDataJSON() as { robot_id: string }
      map.docking_stations[0].robot_id = body.robot_id
      await route.fulfill({ status: 204 })
      return
    }

    if (request.method() === 'GET' && url.pathname === `/api/v1/maps/${mapId}`) {
      detailReads += 1
      await route.fulfill({
        json: { data: map, message: 'Success', statusCode: 200 },
      })
      return
    }

    await route.fulfill({ status: 404, json: { detail: 'Not found' } })
  })

  await page.goto(`/operations/maps/${mapId}`)
  await expect(page.getByRole('heading', { level: 3, name: map.name })).toBeVisible()
  return { requests, map, getDetailReads: () => detailReads }
}

for (const role of ['admin', 'owner']) {
  test(`${role} assigns a map robot to a docking station and refreshes map detail`, async ({
    page,
  }) => {
    const { requests, map, getDetailReads } = await setup(page, role)
    const canvas = page
      .getByRole('region', { name: 'Map boundary editor' })
      .locator('canvas')
      .first()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Map detail canvas is missing')

    // The station occupies world coordinates x=9..11, y=4..6 on a 20×12 map.
    // Convert its center to the editor's 10 px/m canvas projection plus 20 px padding.
    const rightClickX = box.x + 20 + 10 * 10
    const rightClickY = box.y + 20 + (12 - 5) * 10
    await page.mouse.click(rightClickX, rightClickY, { button: 'right' })
    const contextMenu = page.getByRole('menu')
    await expect(contextMenu).toBeVisible()
    const menuBox = await contextMenu.boundingBox()
    if (!menuBox) throw new Error('Docking station context menu is missing')
    expect(Math.abs(menuBox.x - rightClickX)).toBeLessThanOrEqual(8)
    expect(Math.abs(menuBox.y - rightClickY)).toBeLessThanOrEqual(8)
    await page.getByRole('menuitem', { name: 'Assign Robot' }).click()

    const dialog = page.getByRole('dialog', { name: 'Assign Robot' })
    const robotOption = dialog.getByRole('button', { name: /Atlas 21/ })
    await expect(robotOption).toBeEnabled()
    const initialBorderColor = await robotOption.evaluate(
      (element) => getComputedStyle(element).borderTopColor,
    )
    await robotOption.click()
    await expect(robotOption).toHaveAttribute('aria-pressed', 'true')
    await expect(robotOption).toHaveCSS('border-top-width', '2px')
    await expect(robotOption).toHaveCSS('border-right-width', '2px')
    await expect(robotOption).toHaveCSS('border-bottom-width', '2px')
    await expect(robotOption).toHaveCSS('border-left-width', '2px')
    const selectedBorderColors = await robotOption.evaluate((element) => {
      const style = getComputedStyle(element)
      return [
        style.borderTopColor,
        style.borderRightColor,
        style.borderBottomColor,
        style.borderLeftColor,
      ]
    })
    expect(selectedBorderColors[0]).not.toBe(initialBorderColor)
    expect(selectedBorderColors).toEqual(Array(4).fill(selectedBorderColors[0]))

    const assignmentResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'PUT' &&
        response.url().endsWith(`/api/v1/maps/${mapId}/docking/${stationId}/`),
    )
    await dialog.getByRole('button', { name: 'Save', exact: true }).click()
    expect((await assignmentResponse).status()).toBe(204)

    await expect(dialog).not.toBeVisible()
    await expect.poll(getDetailReads).toBeGreaterThan(1)
    expect(map.docking_stations[0].robot_id).toBe(robotId)
    expect(requests).toContainEqual({
      method: 'PUT',
      url: `/api/v1/maps/${mapId}/docking/${stationId}/`,
      body: { robot_id: robotId },
    })
  })
}
