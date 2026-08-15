import { createFileRoute } from '@tanstack/react-router'
import { getTranslations } from '@/lib/translation'

export const Route = createFileRoute('/_authenticated/management/schedules')({
  component: SchedulesPage,
})
const t = getTranslations()

function SchedulesPage() {
  return <h1 className="text-2xl font-bold">{t.sidebar_schedules()}</h1>
}
