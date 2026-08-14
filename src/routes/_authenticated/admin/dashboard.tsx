import { createFileRoute } from '@tanstack/react-router'
import { getTranslations } from '@/lib/translation'

export const Route = createFileRoute('/_authenticated/admin/dashboard')({
  component: AdminDashboardPage,
})

const t = getTranslations()

function AdminDashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">{t.sidebar_dashboard()}</h1>
    </div>
  )
}
