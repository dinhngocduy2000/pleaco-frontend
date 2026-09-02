import { expect, test } from '@playwright/test'

const groupId = '00000000-0000-4000-8000-000000000010'
const robotId = '00000000-0000-4000-8000-000000000001'

test.describe('Robots API integration', () => {
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
        await route.fulfill({ json: { data: [], message: 'OK', statusCode: 200 } })
        return
      }

      if (pathname.endsWith('/bots') && request.method() === 'POST') {
        await route.fulfill({ json: { data: undefined, message: 'Created', statusCode: 201 } })
        return
      }

      if (pathname.endsWith(`/bots/${robotId}`) && request.method() === 'DELETE') {
        await route.fulfill({ json: { data: undefined, message: 'Deleted', statusCode: 200 } })
        return
      }

      if (pathname.endsWith('/bots')) {
        await route.fulfill({
          json: {
            items: [
              {
                id: robotId,
                name: 'Milo',
                serial_num: 'PLC-L-0012',
                model: 'LITE',
                ip_address: '192.168.10.21',
                operational_status: 'IDLE',
                connection_status: 'ONLINE',
                created_at: '2026-08-23T00:00:00.000Z',
                tags: [],
              },
            ],
            page: 1,
            page_size: 10,
            total: 1,
            message: 'OK',
            statusCode: 200,
          },
        })
        return
      }

      await route.fallback()
    })
  })

  test('requests a group-scoped, paginated robot list', async ({ page }) => {
    const robotsRequest = page.waitForRequest((request) =>
      new URL(request.url()).pathname.endsWith('/bots'),
    )

    await page.goto('/operations/robots')

    const params = new URL((await robotsRequest).url()).searchParams
    expect(params).toMatchObject({ group_id: groupId, page: '1', page_size: '10' })
    await expect(page.getByRole('heading', { name: 'Milo' })).toBeVisible()
  })

  test('submits the robot creation payload to the bots endpoint', async ({ page }) => {
    await page.goto('/operations/robots')
    await page.getByRole('button', { name: 'Create robot' }).click()

    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Robot name').fill('Pleaco One')
    await dialog.getByLabel('Serial number').fill('PL-2026-0042')
    await dialog.getByLabel('IP address').fill('192.168.1.42')

    const requestPromise = page.waitForRequest(
      (request) => new URL(request.url()).pathname.endsWith('/bots') && request.method() === 'POST',
    )
    await dialog.getByRole('button', { name: 'Create robot' }).click()

    expect(JSON.parse((await requestPromise).postData() ?? '{}')).toEqual({
      group_id: groupId,
      name: 'Pleaco One',
      serial_num: 'PL-2026-0042',
      model: 'STANDARD',
      map_id: null,
      ip_address: '192.168.1.42',
      tags: [],
    })
  })

  test('deletes the selected robot through the bots endpoint', async ({ page }) => {
    await page.goto('/operations/robots')
    await page.getByRole('button', { name: 'Robot options' }).click()
    await page.getByRole('menuitem', { name: 'Delete' }).click()

    const requestPromise = page.waitForRequest(
      (request) =>
        new URL(request.url()).pathname.endsWith(`/bots/${robotId}`) &&
        request.method() === 'DELETE',
    )
    await page.getByRole('alertdialog').getByRole('button', { name: 'Confirm' }).click()

    expect(new URL((await requestPromise).url()).pathname).toMatch(new RegExp(`/bots/${robotId}$`))
  })
})
