import { createFileRoute } from '@tanstack/react-router'
import { getTranslations } from '@/lib/translation'

export const Route = createFileRoute('/_authenticated/feedback')({ component: FeedbackPage })

const t = getTranslations()

function FeedbackPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">{t.sidebar_feedback()}</h1>
    </div>
  )
}
