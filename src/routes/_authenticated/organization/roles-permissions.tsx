import { createFileRoute } from '@tanstack/react-router'
import { getTranslations } from '@/lib/translation'

export const Route = createFileRoute('/_authenticated/organization/roles-permissions')({
  component: RolesAndPermissionsPage,
})
const t = getTranslations()

function RolesAndPermissionsPage() {
  return <h1 className="text-2xl font-bold">{t.sidebar_roles_permissions()}</h1>
}
