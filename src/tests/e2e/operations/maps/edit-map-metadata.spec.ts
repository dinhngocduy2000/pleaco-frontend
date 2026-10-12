import { expect, type Page, test } from '@playwright/test'
import type { IUpdateMapMetadataRequest } from '@/interface/maps'
import groupData from '../../data/group.json' with { type: 'json' }
import profileData from '../../data/profile.json' with { type: 'json' }
import tagData from '../../data/tags.json' with { type: 'json' }
import { API_PROFILE, setupAuthenticatedPage } from '../../utils/setup-authenticated'

const mapId = '00000000-0000-4000-8000-000000000011'
const detailPath = `/api/v1/maps/${mapId}`
const originalName = 'Warehouse map'
type Metadata = Omit<IUpdateMapMetadataRequest, 'map_id'>

class MetadataPage {
  constructor(readonly page: Page) {}
  dialog() {
    return this.page.getByRole('dialog', { name: 'Edit Metadata' })
  }
  name() {
    return this.dialog().getByRole('textbox', { name: 'Name', exact: true })
  }
  description() {
    return this.dialog().getByRole('textbox', { name: 'Description' })
  }
  tags() {
    return this.dialog().getByRole('combobox', { name: 'Tags' })
  }
  save() {
    return this.dialog().getByRole('button', { name: 'Save', exact: true })
  }

  async open() {
    await this.page.getByRole('button', { name: 'Edit Metadata', exact: true }).click()
    await expect(this.dialog()).toBeVisible()
  }

  async toggleTag(name: string) {
    await this.tags().click()
    await this.page.getByRole('option', { name, exact: true }).click()
    await this.page.keyboard.press('Escape')
  }

  async submit() {
    const response = this.page.waitForResponse(
      (res) => res.url().endsWith(detailPath) && res.request().method() === 'PUT',
    )
    await this.save().click()
    return await response
  }
}

async function setup(page: Page, role = 'owner') {
  let activeGroupId = profileData.activeOwnerUser.data.group_id
  let activeRole = role
  let detail = {
    id: mapId,
    name: originalName,
    description: 'Original description',
    status: 'UNASSIGNED',
    dimension_x: 20,
    dimension_y: 10,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    tags: [tagData.tags[0]],
    robots: [],
    boundary: null,
    zones: [],
    docking_stations: [],
  }
  const state = { requests: [] as Metadata[], nextError: 0, reads: 0 }
  await setupAuthenticatedPage(page, profileData.activeOwnerUser)
  await page.route(API_PROFILE, (route) =>
    route.fulfill({
      json: {
        ...profileData.activeOwnerUser,
        data: {
          ...profileData.activeOwnerUser.data,
          group_id: activeGroupId,
          group: {
            ...profileData.activeOwnerUser.data.group,
            value: activeGroupId,
            role: activeRole,
          },
        },
      },
    }),
  )
  await page.route('**/api/v1/groups/key-value', (route) =>
    route.fulfill({ json: groupData.listGroupKeyValue }),
  )
  await page.route('**/api/v1/groups/switch', (route) => {
    activeGroupId = route.request().postDataJSON().group_id
    activeRole = 'owner'
    detail = { ...detail, name: 'Other group map' }
    return route.fulfill({ json: { data: null, message: 'Success', statusCode: 200 } })
  })
  await page.route('**/api/v1/tags**', (route) =>
    route.fulfill({
      json: {
        data: tagData.tags,
        message: 'Success',
        statusCode: 200,
      },
    }),
  )
  await page.route(`**${detailPath}`, async (route) => {
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON() as Metadata
      state.requests.push(body)
      if (state.nextError) {
        const status = state.nextError
        state.nextError = 0
        await route.fulfill({
          status,
          json: { detail: status === 400 ? 'Duplicate name' : 'Save failed' },
        })
        return
      }
      detail = {
        ...detail,
        name: body.name,
        description: body.description ?? detail.description,
        tags: body.tags ? tagData.tags.filter((tag) => body.tags?.includes(tag.id)) : detail.tags,
        updated_at: '2026-10-12T00:00:00Z',
      }
      await route.fulfill({ json: 'Updated successfully' })
      return
    }
    state.reads += 1
    await route.fulfill({ json: { data: detail, message: 'Success', statusCode: 200 } })
  })
  await page.goto(`/operations/maps/${mapId}`)
  await expect(page.getByRole('heading', { level: 3, name: originalName })).toBeVisible()
  return { editor: new MetadataPage(page), state }
}

test.describe('Edit map metadata', () => {
  test('saves all fields, refreshes detail and reopens with saved defaults', async ({ page }) => {
    const { editor, state } = await setup(page)
    await editor.open()
    await expect(editor.name()).toHaveValue(originalName)
    await expect(editor.description()).toHaveValue('Original description')
    await expect(editor.tags()).toContainText(tagData.tags[0].name)
    await expect(editor.save()).toBeDisabled()
    await editor.name().fill('Updated warehouse')
    await editor.description().fill('Updated description')
    await editor.toggleTag(tagData.tags[0].name)
    await editor.toggleTag(tagData.tags[1].name)
    expect((await editor.submit()).status()).toBe(200)
    await expect(editor.dialog()).not.toBeVisible()
    expect(state.requests).toEqual([
      { name: 'Updated warehouse', description: 'Updated description', tags: [tagData.tags[1].id] },
    ])
    await expect(page.getByRole('heading', { level: 3, name: 'Updated warehouse' })).toBeVisible()
    await expect(page.getByText('Updated description', { exact: true })).toBeVisible()
    await expect(page.getByText(tagData.tags[1].name, { exact: true })).toBeVisible()
    expect(state.reads).toBeGreaterThanOrEqual(2)
    await editor.open()
    await expect(editor.name()).toHaveValue('Updated warehouse')
    await expect(editor.description()).toHaveValue('Updated description')
    await expect(editor.tags()).toContainText(tagData.tags[1].name)
    await expect(editor.save()).toBeDisabled()
  })

  test('clears optional description and all tags explicitly', async ({ page }) => {
    const { editor, state } = await setup(page)
    await editor.open()
    await editor.description().fill('')
    await editor.toggleTag(tagData.tags[0].name)
    await editor.submit()
    await expect(editor.dialog()).not.toBeVisible()
    expect(state.requests).toEqual([{ name: originalName, description: '', tags: [] }])
    await expect(page.getByText('Original description', { exact: true })).not.toBeVisible()
    await editor.open()
    await expect(editor.description()).toHaveValue('')
    await expect(editor.tags()).toContainText('Select tags')
  })

  test('gates invalid and reverted values and accepts boundary lengths', async ({ page }) => {
    const { editor, state } = await setup(page)
    await editor.open()
    await editor.name().fill('   ')
    await expect(editor.dialog().getByText('Map name is required')).toBeVisible()
    await expect(editor.save()).toBeDisabled()
    await editor.name().fill('x'.repeat(51))
    await expect(editor.dialog().getByText('Name must be at most 50 characters')).toBeVisible()
    await expect(editor.save()).toBeDisabled()
    await editor.name().fill('x'.repeat(50))
    await editor.description().fill('d'.repeat(251))
    await expect(
      editor.dialog().getByText('Description must be at most 250 characters'),
    ).toBeVisible()
    await expect(editor.save()).toBeDisabled()
    await editor.description().fill('d'.repeat(250))
    await expect(editor.save()).toBeEnabled()
    await editor.name().fill(originalName)
    await editor.description().fill('Original description')
    await expect(editor.save()).toBeDisabled()
    expect(state.requests).toEqual([])
  })

  test('discards edits on every close action without confirmation', async ({ page }) => {
    const { editor, state } = await setup(page)
    for (const close of ['Cancel', 'Close', 'Escape', 'Outside']) {
      await editor.open()
      await expect(editor.name()).toHaveValue(originalName)
      await editor.name().fill('Discard this')
      if (close === 'Escape') await page.keyboard.press('Escape')
      else if (close === 'Outside') await page.mouse.click(5, 5)
      else await editor.dialog().getByRole('button', { name: close, exact: true }).click()
      await expect(editor.dialog()).not.toBeVisible()
      await expect(page.getByRole('alertdialog')).not.toBeVisible()
    }
    expect(state.requests).toEqual([])
  })

  test('retains edits after a server failure and permits retry', async ({ page }) => {
    const { editor, state } = await setup(page)
    state.nextError = 500
    await editor.open()
    await editor.name().fill('Retry map')
    expect((await editor.submit()).status()).toBe(500)
    await expect(page.getByText('Save failed', { exact: true })).toBeVisible()
    await expect(editor.name()).toHaveValue('Retry map')
    await expect(editor.save()).toBeEnabled()
    await editor.submit()
    await expect(editor.dialog()).not.toBeVisible()
    await expect(page.getByRole('heading', { level: 3, name: 'Retry map' })).toBeVisible()
    expect(state.requests).toHaveLength(2)
  })

  test('shows duplicate-name errors on Name and permits correction', async ({ page }) => {
    const { editor, state } = await setup(page)
    state.nextError = 400
    await editor.open()
    await editor.name().fill('Duplicate')
    await editor.submit()
    await expect(
      editor.dialog().getByText('A map with this name already exists in the active group'),
    ).toBeVisible()
    await expect(editor.save()).toBeDisabled()
    await editor.name().fill('Unique map')
    await editor.submit()
    await expect(editor.dialog()).not.toBeVisible()
  })

  for (const role of ['admin', 'member']) {
    test(`respects ${role} editing permissions`, async ({ page }) => {
      await setup(page, role)
      const button = page.getByRole('button', { name: 'Edit Metadata', exact: true })
      if (role === 'admin') await expect(button).toBeVisible()
      else await expect(button).not.toBeVisible()
    })
  }

  test('opens metadata from the new active group without an earlier draft', async ({ page }) => {
    const { editor, state } = await setup(page)
    await editor.open()
    await editor.name().fill('Old group draft')
    await editor.dialog().getByRole('button', { name: 'Cancel', exact: true }).click()
    await page.getByRole('combobox').filter({ hasText: 'GRP-' }).click()
    await page.getByRole('option', { name: groupData.listGroupKeyValue.data[1].label }).click()
    await expect(editor.dialog()).not.toBeVisible()
    await expect(page.getByRole('heading', { level: 3, name: 'Other group map' })).toBeVisible()
    await editor.open()
    await expect(editor.name()).toHaveValue('Other group map')
    await expect(editor.save()).toBeDisabled()
    expect(state.requests).toEqual([])
  })
})
