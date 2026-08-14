import { createFileRoute } from '@tanstack/react-router'
import { getTranslations } from '@/lib/translation'

export const Route = createFileRoute('/_authenticated/admin/feedback')({
  component: AdminFeedbackPage,
})

const t = getTranslations()

function AdminFeedbackPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">{t.sidebar_admin_feedback()}</h1>
    </div>
  )
}
