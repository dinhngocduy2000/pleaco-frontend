import { expect, type Page, test } from '@playwright/test'
import groupData from '../../data/group.json' with { type: 'json' }
import mapData from '../../data/maps.json' with { type: 'json' }
import profileData from '../../data/profile.json' with { type: 'json' }
import tagData from '../../data/tags.json' with { type: 'json' }
import { API_PROFILE, setupAuthenticatedPage } from '../../utils/setup-authenticated'

const MAPS_URL = '/operations/maps'
const API_MAPS = '**/api/v1/maps**'
const API_GROUPS_KEY_VALUE = '**/api/v1/groups/key-value'
const API_SWITCH_GROUP = '**/api/v1/groups/switch'
const API_TAGS = '**/api/v1/tags**'

type MapFixture = (typeof mapData.primaryGroupMaps)[number]

type MapItem = Omit<MapFixture, 'tag_ids'> & {
  tags: (typeof tagData.tags)[number][]
}

const primaryGroupId = mapData.groupId
const secondaryGroup = groupData.listGroupKeyValue.data[1]

const hydrateMaps = (maps: readonly MapFixture[]): MapItem[] =>
  maps.map(({ tag_ids: tagIds, ...map }) => ({
    ...map,
    tags: tagData.tags.filter((tag) => tagIds.includes(tag.id)),
  }))

const mapsForRequest = (maps: MapItem[], url: URL): MapItem[] => {
  const search = url.searchParams.get('search')?.toLowerCase()
  const status = url.searchParams.get('status')
  const tagIds = url.searchParams.getAll('tag_ids')
  const direction = url.searchParams.get('order_direction') ?? 'desc'

  return maps
    .filter((map) => !search || map.name.toLowerCase().includes(search))
    .filter((map) => !status || map.status === status)
    .filter(
      (map) => tagIds.length === 0 || tagIds.every((id) => map.tags.some((tag) => tag.id === id)),
    )
    .sort((left, right) => {
      const comparison = left.updated_at.localeCompare(right.updated_at)
      return direction === 'asc' ? comparison : -comparison
    })
}

async function setupMapsList(page: Page) {
  let activeGroupId = primaryGroupId
  const listRequests: URL[] = []
  const mapsByGroup = new Map<string, MapItem[]>([
    [primaryGroupId, hydrateMaps(mapData.primaryGroupMaps)],
    [secondaryGroup.value, hydrateMaps(mapData.secondaryGroupMaps as MapFixture[])],
  ])

  await setupAuthenticatedPage(page, profileData.activeOwnerUser)
  await page.route(API_PROFILE, (route) => {
    const activeGroup = groupData.listGroupKeyValue.data.find(
      (group) => group.value === activeGroupId,
    )
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...profileData.activeOwnerUser,
        data: {
          ...profileData.activeOwnerUser.data,
          group_id: activeGroupId,
          group: activeGroup ? { ...activeGroup, role: 'owner' } : null,
        },
      }),
    })
  })
  await page.route(API_GROUPS_KEY_VALUE, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(groupData.listGroupKeyValue),
    }),
  )
  await page.route(API_SWITCH_GROUP, async (route) => {
    const request = route.request().postDataJSON() as { group_id: string }
    activeGroupId = request.group_id
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: null, message: 'Success', statusCode: 200 }),
    })
  })
  await page.route(API_TAGS, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: tagData.tags, message: 'Success', statusCode: 200 }),
    }),
  )
  await page.route(API_MAPS, (route) => {
    const requestUrl = new URL(route.request().url())
    const maps = mapsForRequest(mapsByGroup.get(activeGroupId) ?? [], requestUrl)
    listRequests.push(requestUrl)
    return route.fulfill({
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
  })

  await page.goto(MAPS_URL)
  await expect(page.getByRole('heading', { name: 'Maps' })).toBeVisible()
  await expectMapOrder(page, [
    'Lobby Atrium',
    'Night Shift Wing',
    'Lobby Hall',
    'Lobby Storage',
    'Roof Deck',
  ])

  return { listRequests }
}

async function expectMapOrder(page: Page, names: string[]) {
  const cards = page.getByRole('article')
  await expect(cards).toHaveCount(names.length)
  await expect
    .poll(() => cards.evaluateAll((items) => items.map((item) => item.getAttribute('aria-label'))))
    .toEqual(names)
}

async function searchMaps(page: Page, search: string) {
  const response = page.waitForResponse((candidate) => {
    const url = new URL(candidate.url())
    return url.pathname.endsWith('/maps') && url.searchParams.get('search') === search
  })
  await page.getByRole('textbox', { name: 'Search maps' }).fill(search)
  return new URL((await response).url())
}

async function filterByStatus(page: Page, status: 'Assigned' | 'Unassigned') {
  const response = page.waitForResponse((candidate) => {
    const url = new URL(candidate.url())
    return url.pathname.endsWith('/maps') && url.searchParams.get('status') === status.toUpperCase()
  })
  await page.getByRole('combobox').filter({ hasText: 'Filter maps' }).click()
  await page.getByRole('option', { name: status, exact: true }).click()
  return new URL((await response).url())
}

async function filterByTag(page: Page, tagName: string) {
  const tag = tagData.tags.find((candidate) => candidate.name === tagName)
  if (!tag) throw new Error(`Missing tag fixture: ${tagName}`)

  const response = page.waitForResponse((candidate) => {
    const url = new URL(candidate.url())
    return url.pathname.endsWith('/maps') && url.searchParams.get('tag_ids') === tag.id
  })
  await page.getByRole('combobox').filter({ hasText: 'Filter by tags' }).click()
  await page.getByRole('option', { name: tagName, exact: true }).click()
  const url = new URL((await response).url())
  await page.keyboard.press('Escape')
  return url
}

async function sortAscending(page: Page) {
  const response = page.waitForResponse((candidate) => {
    const url = new URL(candidate.url())
    return url.pathname.endsWith('/maps') && url.searchParams.get('order_direction') === 'asc'
  })
  await page.getByRole('button', { name: 'Descending' }).click()
  await page.getByRole('menuitem', { name: 'Ascending' }).click()
  return new URL((await response).url())
}

test.describe('Maps list', () => {
  test('renders only the active group maps in descending update order', async ({ page }) => {
    const { listRequests } = await setupMapsList(page)

    expect(listRequests.at(-1)?.searchParams.get('order_direction')).toBe('desc')
    await expect(page.getByRole('article', { name: 'Test 2 Warehouse' })).toHaveCount(0)
  })

  test('searches maps by name independently', async ({ page }) => {
    await setupMapsList(page)

    const requestUrl = await searchMaps(page, 'lobby')

    expect(requestUrl.searchParams.get('search')).toBe('lobby')
    await expectMapOrder(page, ['Lobby Atrium', 'Lobby Hall', 'Lobby Storage'])
  })

  test('filters maps by status independently', async ({ page }) => {
    await setupMapsList(page)

    const requestUrl = await filterByStatus(page, 'Assigned')

    expect(requestUrl.searchParams.get('status')).toBe('ASSIGNED')
    await expectMapOrder(page, ['Lobby Atrium', 'Roof Deck'])
  })

  test('filters maps by tag independently', async ({ page }) => {
    await setupMapsList(page)

    const requestUrl = await filterByTag(page, 'Night shift')

    expect(requestUrl.searchParams.get('tag_ids')).toBe(tagData.tags[1].id)
    await expectMapOrder(page, ['Night Shift Wing'])
  })

  test('sorts maps independently in ascending update order', async ({ page }) => {
    await setupMapsList(page)

    const requestUrl = await sortAscending(page)

    expect(requestUrl.searchParams.get('order_direction')).toBe('asc')
    await expectMapOrder(page, [
      'Roof Deck',
      'Lobby Storage',
      'Lobby Hall',
      'Night Shift Wing',
      'Lobby Atrium',
    ])
  })

  test('combines search, status, tag, and sorting in one list request', async ({ page }) => {
    await setupMapsList(page)

    await searchMaps(page, 'lobby')
    await filterByStatus(page, 'Unassigned')
    await filterByTag(page, 'Lobby')
    const requestUrl = await sortAscending(page)

    expect(requestUrl.searchParams.get('search')).toBe('lobby')
    expect(requestUrl.searchParams.get('status')).toBe('UNASSIGNED')
    expect(requestUrl.searchParams.getAll('tag_ids')).toEqual([tagData.tags[0].id])
    expect(requestUrl.searchParams.get('order_direction')).toBe('asc')
    await expectMapOrder(page, ['Lobby Storage', 'Lobby Hall'])
  })

  test('refreshes the list with the newly active group maps', async ({ page }) => {
    await setupMapsList(page)
    const switchedMapsResponse = page.waitForResponse((candidate) => {
      const url = new URL(candidate.url())
      return url.pathname.endsWith('/maps') && candidate.request().method() === 'GET'
    })

    await page.getByRole('combobox').filter({ hasText: 'GRP-' }).click()
    const switchResponse = page.waitForResponse(
      (candidate) =>
        candidate.url().includes('/api/v1/groups/switch') && candidate.request().method() === 'PUT',
    )
    await page.getByRole('option', { name: secondaryGroup.label }).click()

    expect((await switchResponse).status()).toBe(200)
    expect((await switchedMapsResponse).status()).toBe(200)
    await expect(page.getByTestId('selected-label')).toHaveText(secondaryGroup.label)
    await expectMapOrder(page, ['Test 2 Warehouse'])
    await expect(page.getByRole('article', { name: 'Lobby Atrium' })).toHaveCount(0)
  })
})
