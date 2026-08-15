import { createFileRoute } from '@tanstack/react-router'
import { getTranslations } from '@/lib/translation'

export const Route = createFileRoute('/_authenticated/organization/audit-logs')({
  component: AuditLogsPage,
})
const t = getTranslations()

function AuditLogsPage() {
  return <h1 className="text-2xl font-bold">{t.sidebar_audit_logs()}</h1>
}
