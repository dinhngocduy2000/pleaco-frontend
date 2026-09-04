import test, { expect } from '@playwright/test'
import groupData from '../../data/group.json' with { type: 'json' }
import profileData from '../../data/profile.json' with { type: 'json' }
import { API_PROFILE, HOME_URL, setupAuthenticatedPage } from '../../utils/setup-authenticated'

const API_SWITCH_GROUP = '**/api/v1/groups/switch'
const API_KEY_VALUE_LIST = '**/api/v1/groups/key-value'
test.describe('Switch active group', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedPage(page, profileData.userWithGroup)
    await page.goto(HOME_URL)
    await page.route(API_KEY_VALUE_LIST, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(groupData.listGroupKeyValue),
      }),
    )
  })
  test('Show correct group when user has an active group', async ({ page }) => {
    await expect(page.getByTestId('selected-label')).toHaveText('Test')
    await expect(page.getByTestId('selected-label')).toHaveAttribute(
      'id',
      '660e8400-e29b-41d4-a716-446655440001',
    )
  })
  test('Show correct list of groups in the list of options', async ({ page }) => {
    const triggerButton = page.getByTestId('select-trigger')
    await triggerButton.click()
    const listGroup = groupData.listGroupKeyValue.data
    for (const group of listGroup) {
      await expect(page.getByTestId(`select-item-${group.value}`)).toBeVisible()
      await expect(page.getByTestId(`select-item-label-${group.value}`)).toHaveText(group.label)
    }
  })
  test('The Selected group is highlighted in the list of options', async ({ page }) => {
    const triggerButton = page.getByTestId('select-trigger')
    await triggerButton.click()
    await expect(
      page.getByTestId(`select-item-${profileData.userWithGroup.data.group_id}`),
    ).toHaveAttribute('data-selected', 'true')
  })

  test('Show correct list of groups in the list of options when search', async ({ page }) => {
    const triggerButton = page.getByTestId('select-trigger')
    const searchInput = page.getByTestId('select-search-input')
    await triggerButton.click()
    await searchInput.fill('Test 2')
    await page.waitForTimeout(1000)
    const listGroup = groupData.listGroupKeyValue.data
    const searchedOptions = listGroup.filter((group) => group.label.includes('Test 2'))
    await expect(page.getByTestId(`select-item-${searchedOptions[0].value}`)).toBeVisible()
    await expect(page.getByTestId(`select-item-label-${searchedOptions[0].value}`)).toHaveText(
      searchedOptions[0].label,
    )
  })

  test('sends correct group_id on select', async ({ page }) => {
    let capturedBody: Record<string, unknown> | null = null
    await page.route(API_SWITCH_GROUP, async (route) => {
      capturedBody = route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'Success',
      })
    })
    await page.waitForResponse(API_PROFILE)
    const triggerButton = page.getByTestId('select-trigger')
    await triggerButton.click()
    const listGroup = groupData.listGroupKeyValue.data
    const secondGroupSelect = page.getByTestId(`select-item-${listGroup[1].value}`)
    await secondGroupSelect.click()

    await page.route(API_PROFILE, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(profileData.userWithGroup),
      })
    })

    expect(capturedBody).toMatchObject({
      group_id: listGroup[1].value,
    })
  })
})
