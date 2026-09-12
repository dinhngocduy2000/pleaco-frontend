import { expect, test } from '@playwright/test'
import groupData from '../../data/group.json' with { type: 'json' }
import profileData from '../../data/profile.json' with { type: 'json' }
import { API_PROFILE, setupAuthenticatedPage } from '../../utils/setup-authenticated'

const MAP_DETAIL_URL = '/operations/maps/map-1'
const API_MAP_DETAIL = '**/api/v1/maps/map-1'
const API_GROUPS_KEY_VALUE = '**/api/v1/groups/key-value'
const API_SWITCH_GROUP = '**/api/v1/groups/switch'
const primaryGroupId = profileData.activeOwnerUser.data.group_id
const secondaryGroup = groupData.listGroupKeyValue.data[1]

const detailByGroup = {
  [primaryGroupId]: {
    data: {
      id: 'map-1',
      name: 'Warehouse — Floor 1',
      description: 'Main warehouse cleaning area',
      status: 'ASSIGNED',
      dimension_x: 24,
      dimension_y: 18,
      created_at: '2026-09-01T00:00:00.000Z',
      updated_at: '2026-09-10T00:00:00.000Z',
      tags: [{ id: 'tag-1', name: 'Warehouse' }],
      boundary: {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [24, 0],
            [24, 18],
            [0, 0],
          ],
        ],
      },
      zones: [
        {
          id: 'zone-1',
          type: 'OBSTACLE',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [2, 2],
                [4, 2],
                [2, 4],
                [2, 2],
              ],
            ],
          },
        },
      ],
      robots: [
        {
          id: 'robot-1',
          name: 'Atlas 01',
          serial_num: 'PLC-PRO-00018',
          model: 'PRO',
          connection_status: 'ONLINE',
          operational_status: 'EXECUTING',
        },
      ],
    },
    message: 'Success',
    statusCode: 200,
  },
  [secondaryGroup.value]: {
    data: {
      id: 'map-1',
      name: 'Secondary Warehouse',
      description: null,
      status: 'UNASSIGNED',
      dimension_x: 12,
      dimension_y: 8,
      created_at: '2026-09-01T00:00:00.000Z',
      updated_at: '2026-09-10T00:00:00.000Z',
      tags: [],
      boundary: null,
      zones: [],
      robots: [],
    },
    message: 'Success',
    statusCode: 200,
  },
}

test('renders a tenant-scoped read-only map detail and refreshes after group switching', async ({
  page,
}) => {
  let activeGroupId = primaryGroupId
  const detailRequests: URL[] = []

  await setupAuthenticatedPage(page, profileData.activeOwnerUser)
  await page.route(API_PROFILE, (route) => {
    const group = groupData.listGroupKeyValue.data.find((item) => item.value === activeGroupId)
    return route.fulfill({
      json: {
        ...profileData.activeOwnerUser,
        data: {
          ...profileData.activeOwnerUser.data,
          group_id: activeGroupId,
          group: group ? { ...group, role: 'owner' } : null,
        },
      },
    })
  })
  await page.route(API_GROUPS_KEY_VALUE, (route) =>
    route.fulfill({ json: groupData.listGroupKeyValue }),
  )
  await page.route(API_SWITCH_GROUP, (route) => {
    activeGroupId = (route.request().postDataJSON() as { group_id: string }).group_id
    return route.fulfill({ json: { data: null, message: 'Success', statusCode: 200 } })
  })
  await page.route(API_MAP_DETAIL, (route) => {
    detailRequests.push(new URL(route.request().url()))
    return route.fulfill({ json: detailByGroup[activeGroupId as keyof typeof detailByGroup] })
  })

  await page.goto(MAP_DETAIL_URL)

  await expect(page.getByRole('heading', { level: 1, name: 'Warehouse — Floor 1' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Map boundary editor' })).toBeVisible()
  await expect(page.getByText('1 Obstacles')).toBeVisible()
  await expect(page.getByText('Atlas 01')).toBeVisible()
  await expect(page.getByRole('status', { name: 'Online' })).toBeVisible()
  expect(detailRequests[0]?.search).toBe('')

  const refreshedDetail = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/v1/maps/map-1') && response.request().method() === 'GET',
  )
  await page.getByRole('combobox').filter({ hasText: 'GRP-' }).click()
  await page.getByRole('option', { name: secondaryGroup.label }).click()
  await refreshedDetail

  await expect(page.getByRole('heading', { level: 1, name: 'Secondary Warehouse' })).toBeVisible()
  expect(detailRequests.length).toBeGreaterThanOrEqual(2)
  expect(detailRequests.every((request) => request.search === '')).toBe(true)
})
