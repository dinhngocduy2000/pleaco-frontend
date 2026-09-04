import { expect, type Page, test } from '@playwright/test'
import { GroupRole, type GroupRoleType, LIST_ROLES } from '@/enum/group'
import { expectRoleVisibility, roleScenarios, setupRoleScenario } from '../utils/role-visibility'
import { HOME_URL } from '../utils/setup-authenticated'

type SidebarSection = {
  label: string
  links: string[]
  allowedRoles: readonly GroupRoleType[]
}

const ownerAndAdminRoles = [GroupRole.OWNER, GroupRole.ADMIN]
const sharedSidebarSections: SidebarSection[] = [
  { label: 'Operations', links: [], allowedRoles: LIST_ROLES },
  { label: 'Management', links: [], allowedRoles: LIST_ROLES },
]
const privilegedSidebarSections: SidebarSection[] = [
  {
    label: 'Organization',
    links: ['Users', 'Roles & Permissions', 'Audit Logs'],
    allowedRoles: ownerAndAdminRoles,
  },
  { label: 'Settings', links: ['Groups Setting'], allowedRoles: ownerAndAdminRoles },
]

async function setupSidebarPage(page: Page, profile: unknown) {
  await setupRoleScenario(page, profile)
  await page.goto(HOME_URL)
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible()
}

async function expectSidebarSections(page: Page, role: GroupRoleType, sections: SidebarSection[]) {
  for (const section of sections) {
    await expectRoleVisibility({
      role,
      allowedRoles: section.allowedRoles,
      locators: [
        page.getByRole('button', { name: section.label, exact: true }),
        ...section.links.map((link) => page.getByRole('link', { name: link, exact: true })),
      ],
    })
  }
}

test.describe('Sidebar role visibility', () => {
  for (const scenario of roleScenarios) {
    test(`shows the correct navigation for ${scenario.name}`, async ({ page }) => {
      await setupSidebarPage(page, scenario.profile)

      await expectSidebarSections(page, scenario.name, sharedSidebarSections)
      await expectSidebarSections(page, scenario.name, privilegedSidebarSections)
    })
  }
})
