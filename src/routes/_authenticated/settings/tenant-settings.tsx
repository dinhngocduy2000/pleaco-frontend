import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/settings/tenant-settings')({
  component: TenantSettingsPage,
})

function TenantSettingsPage() {
  return <section className="space-y-6">TenantSetting</section>
}
