import { createFileRoute } from '@tanstack/react-router'
import { getTranslations } from '@/lib/translation'

export const Route = createFileRoute('/_authenticated/settings/tenant-settings')({
  component: TenantSettingsPage,
})
const t = getTranslations()

function TenantSettingsPage() {
  return <h1 className="text-2xl font-bold">{t.group_members_settings()}</h1>
}
