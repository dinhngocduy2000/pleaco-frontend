import { expect, type Locator, type Page } from '@playwright/test'
import { GroupRole, type GroupRoleType } from '@/enum/group'
import profileData from '../data/profile.json' with { type: 'json' }
import { setupAuthenticatedPage } from './setup-authenticated'

export type RoleScenario = {
  name: GroupRoleType
  profile: unknown
}

type RoleVisibilityExpectation = {
  role: GroupRoleType
  allowedRoles: readonly GroupRoleType[]
  locators: Locator[]
}

export const roleScenarios: RoleScenario[] = [
  { name: GroupRole.OWNER, profile: profileData.activeOwnerUser },
  { name: GroupRole.ADMIN, profile: profileData.activeAdminUser },
  { name: GroupRole.MODERATOR, profile: profileData.activeModeratorUser },
  { name: GroupRole.MEMBER, profile: profileData.activeMemberUser },
]

export async function setupRoleScenario(page: Page, profile: unknown) {
  await setupAuthenticatedPage(page, profile)
}

export async function expectRoleVisibility({
  role,
  allowedRoles,
  locators,
}: RoleVisibilityExpectation) {
  const isVisible = allowedRoles.includes(role)

  for (const locator of locators) {
    if (isVisible) {
      await expect(locator).toBeVisible()
      continue
    }
    await expect(locator).toHaveCount(0)
  }
}
