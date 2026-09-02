import { expect, test } from '@playwright/test'

const groupId = '00000000-0000-4000-8000-000000000010'
const tagId = '00000000-0000-4000-8000-000000000001'

test.describe('Maps API integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('is_logged_in', 'true'))

    await page.route('**/api/**', async (route) => {
      const request = route.request()
      const { pathname } = new URL(request.url())

      if (pathname.endsWith('/auth/profile')) {
        await route.fulfill({
          json: { data: { group_id: groupId }, message: 'OK', statusCode: 200 },
        })
        return
      }

      if (pathname.endsWith('/tags')) {
        await route.fulfill({
          json: { data: [{ id: tagId, name: 'Warehouse' }], message: 'OK', statusCode: 200 },
        })
        return
      }

      if (pathname.endsWith('/bots/key-value')) {
        await route.fulfill({ json: { data: [], message: 'OK', statusCode: 200 } })
        return
      }

      if (pathname.endsWith('/maps') && request.method() === 'POST') {
        await route.fulfill({ json: { data: undefined, message: 'Created', statusCode: 201 } })
        return
      }

      if (pathname.endsWith('/maps')) {
        await route.fulfill({
          json: { items: [], page: 1, page_size: 10, total: 0, message: 'OK', statusCode: 200 },
        })
        return
      }

      await route.fallback()
    })
  })

  test('requests group tags and a paginated map list', async ({ page }) => {
    const tagsRequest = page.waitForRequest((request) =>
      new URL(request.url()).pathname.endsWith('/tags'),
    )
    const mapsRequest = page.waitForRequest((request) =>
      new URL(request.url()).pathname.endsWith('/maps'),
    )

    await page.goto('/operations/maps')

    const [tags, maps] = await Promise.all([tagsRequest, mapsRequest])
    expect(new URL(tags.url()).searchParams.get('group_id')).toBe(groupId)
    expect(new URL(maps.url()).searchParams).toMatchObject({
      page: '1',
      page_size: '10',
      order_direction: 'DESC',
    })
    await expect(page.getByText('No maps found.')).toBeVisible()
  })

  test('submits the map creation payload to the maps endpoint', async ({ page }) => {
    await page.goto('/operations/maps')
    const robotOptionsRequest = page.waitForRequest((request) =>
      new URL(request.url()).pathname.endsWith('/bots/key-value'),
    )
    await page.getByRole('button', { name: 'Create map' }).click()
    expect(new URL((await robotOptionsRequest).url()).pathname).toMatch(/\/bots\/key-value$/)

    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Map name').fill('Warehouse — Floor 1')
    await dialog.getByLabel('Width').fill('20')
    await dialog.getByLabel('Height').fill('12.5')
    await dialog.getByLabel('Description').fill('Main warehouse floor')

    const requestPromise = page.waitForRequest(
      (request) => new URL(request.url()).pathname.endsWith('/maps') && request.method() === 'POST',
    )
    await dialog.getByRole('button', { name: 'Create map' }).click()

    expect(JSON.parse((await requestPromise).postData() ?? '{}')).toEqual({
      group_id: groupId,
      name: 'Warehouse — Floor 1',
      description: 'Main warehouse floor',
      dimension_x: 20,
      dimension_y: 12.5,
      robot_ids: [],
      tags: [],
    })
  })
})
