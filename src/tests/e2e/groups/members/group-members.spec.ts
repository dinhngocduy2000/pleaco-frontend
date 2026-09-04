import { expect, type Page, test } from '@playwright/test'
import groupMembersData from '../../data/group-members.json' with { type: 'json' }
import { setupAuthenticatedPage } from '../../utils/setup-authenticated'

const GROUP_ID = groupMembersData.groupId
const MEMBERS_URL = '/organization/users'
const API_MEMBERS = '**/api/v1/groups/members**'
const API_INVITE_MEMBER = `**/api/v1/groups/${GROUP_ID}/members`
const API_ALICE_MEMBER = `**/api/v1/groups/${GROUP_ID}/members/member-alice`

const copyMembers = () => groupMembersData.initialMembers.map((member) => ({ ...member }))

function getMembersForRequest(members: ReturnType<typeof copyMembers>, url: URL) {
  const email = url.searchParams.get('email')?.toLowerCase()
  const role = url.searchParams.get('role')
  const status = url.searchParams.get('status')
  const orderDirection = url.searchParams.get('order_direction')

  return members
    .filter((member) => !email || member.email.toLowerCase().includes(email))
    .filter((member) => !role || member.role === role)
    .filter((member) => !status || member.status === status)
    .sort((left, right) => {
      const comparison = left.joined_at.localeCompare(right.joined_at)
      return orderDirection === 'asc' ? comparison : -comparison
    })
}

async function setupMembersPage(page: Page) {
  const members = copyMembers()
  const listRequests: URL[] = []

  await setupAuthenticatedPage(page, groupMembersData.ownerProfile)
  await page.route(API_MEMBERS, (route) => {
    const requestUrl = new URL(route.request().url())
    const filteredMembers = getMembersForRequest(members, requestUrl)
    listRequests.push(requestUrl)
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: filteredMembers,
        page: 1,
        page_size: 10,
        total: filteredMembers.length,
        message: 'Success',
        statusCode: 200,
      }),
    })
  })
  await page.goto(MEMBERS_URL)
  await expect(page.getByRole('heading', { name: 'Members Setting' })).toBeVisible()
  await expect(memberRow(page, 'alice@example.com')).toBeVisible()

  return { listRequests, members }
}

function memberRow(page: Page, email: string) {
  return page.getByRole('row').filter({ has: page.getByText(email, { exact: true }) })
}

async function selectRole(page: Page, dialogName: string, role: string) {
  const dialog = page.getByRole('dialog', { name: dialogName })
  await dialog.getByRole('combobox').click()
  await page.getByRole('option', { name: role }).click()
}

test.describe('Group member management', () => {
  test('reads the active group member list', async ({ page }) => {
    const { listRequests } = await setupMembersPage(page)

    await expect(memberRow(page, 'alice@example.com')).toContainText('Alice Admin')
    await expect(memberRow(page, 'bob@example.com')).toContainText('Bob Member')
    expect(listRequests).toHaveLength(1)
    expect(listRequests[0].searchParams.get('group_id')).toBe(GROUP_ID)
    expect(listRequests[0].searchParams.get('page')).toBe('1')
    expect(listRequests[0].searchParams.get('page_size')).toBe('10')
    expect(listRequests[0].searchParams.get('order_by')).toBe('joined_date')
    expect(listRequests[0].searchParams.get('order_direction')).toBe('desc')
  })

  test('filters members by role and sorts the filtered list by oldest join date', async ({
    page,
  }) => {
    await setupMembersPage(page)

    const filterResponse = page.waitForResponse((response) => {
      const url = new URL(response.url())
      return url.pathname.endsWith('/groups/members') && url.searchParams.get('role') === 'admin'
    })
    await page.getByRole('combobox', { name: 'Filter by role' }).click()
    await page.getByRole('option', { name: 'Admin' }).click()
    await filterResponse

    await expect(memberRow(page, 'alice@example.com')).toHaveCount(0)
    await expect(memberRow(page, 'bob@example.com')).toBeVisible()
    await expect(memberRow(page, 'carol@example.com')).toBeVisible()

    const sortResponse = page.waitForResponse((response) => {
      const url = new URL(response.url())
      return (
        url.pathname.endsWith('/groups/members') &&
        url.searchParams.get('role') === 'admin' &&
        url.searchParams.get('order_direction') === 'asc'
      )
    })
    await page.getByRole('button', { name: 'Newest joined' }).click()
    await page.getByRole('menuitem', { name: 'Oldest joined' }).click()
    await sortResponse

    const search = new URL(page.url()).searchParams
    expect(search.get('role')).toBe('admin')
    expect(search.get('order_direction')).toBe('asc')

    const renderedRows = await page.getByRole('row').allTextContents()
    const bobRowIndex = renderedRows.findIndex((row) => row.includes('bob@example.com'))
    const carolRowIndex = renderedRows.findIndex((row) => row.includes('carol@example.com'))
    expect(bobRowIndex).toBeGreaterThan(0)
    expect(carolRowIndex).toBeGreaterThan(bobRowIndex)
  })

  test('invites a member to the active group', async ({ page }) => {
    const { members } = await setupMembersPage(page)

    await page.route(API_INVITE_MEMBER, async (route) => {
      const invitedMembers = route.request().postDataJSON() as { email: string; role: string }[]
      members.push({
        member_id: 'member-new',
        name: 'New Member',
        email: invitedMembers[0].email,
        image_url: null,
        joined_at: '2026-01-03T00:00:00.000Z',
        role: invitedMembers[0].role,
        status: 'PENDING',
        invitation_status: 'PENDING',
      })
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: null, message: 'Success', statusCode: 200 }),
      })
    })

    await page.getByRole('button', { name: 'Invite Members' }).click()
    const dialog = page.getByRole('dialog', { name: 'Invite Members' })
    await dialog.getByLabel('Email').fill('new.member@example.com')
    await selectRole(page, 'Invite Members', 'Admin')

    const requestPromise = page.waitForRequest(API_INVITE_MEMBER)
    await dialog.getByRole('button', { name: 'Send invitation' }).click()
    const request = await requestPromise

    expect(request.postDataJSON()).toEqual([{ email: 'new.member@example.com', role: 'admin' }])
    await expect(page.getByText('An invitation email has been sent.')).toBeVisible()
    await expect(memberRow(page, 'new.member@example.com')).toContainText('admin')
  })

  test('updates a member role', async ({ page }) => {
    const { members } = await setupMembersPage(page)

    await page.route(API_ALICE_MEMBER, async (route) => {
      const { role } = route.request().postDataJSON() as { role: string }
      const member = members.find(({ member_id }) => member_id === 'member-alice')
      if (member) member.role = role
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: null, message: 'Success', statusCode: 200 }),
      })
    })

    await memberRow(page, 'alice@example.com').getByRole('button', { name: 'Edit member' }).click()
    await selectRole(page, 'Edit Member', 'Admin')

    const responsePromise = page.waitForResponse(API_ALICE_MEMBER)
    await page
      .getByRole('dialog', { name: 'Edit Member' })
      .getByRole('button', {
        name: 'Save changes',
      })
      .click()
    const response = await responsePromise

    expect(response.request().method()).toBe('PUT')
    expect(response.request().postDataJSON()).toEqual({ role: 'admin' })
    await expect(
      page.getByText('Member alice@example.com has been updated successfully.'),
    ).toBeVisible()
    await expect(memberRow(page, 'alice@example.com')).toContainText('admin')
  })

  test('removes a member after confirmation', async ({ page }) => {
    const { members } = await setupMembersPage(page)

    await page.route(API_ALICE_MEMBER, async (route) => {
      const memberIndex = members.findIndex(({ member_id }) => member_id === 'member-alice')
      members.splice(memberIndex, 1)
      await route.fulfill({ status: 200, contentType: 'application/json', body: '' })
    })

    await memberRow(page, 'alice@example.com')
      .getByRole('button', { name: 'Deleting members is coming soon' })
      .click()
    const confirmDialog = page.getByRole('alertdialog')
    await expect(confirmDialog).toContainText('alice@example.com')

    const responsePromise = page.waitForResponse(API_ALICE_MEMBER)
    await confirmDialog.getByRole('button', { name: 'Confirm' }).click()
    const response = await responsePromise

    expect(response.request().method()).toBe('DELETE')
    await expect(
      page.getByText('Member alice@example.com has been successfully removed from the group'),
    ).toBeVisible()
    await expect(memberRow(page, 'alice@example.com')).toHaveCount(0)
  })
})
