import { createFileRoute } from '@tanstack/react-router'
import { getTranslations } from '@/lib/translation'

export const Route = createFileRoute('/_authenticated/management/incidents')({
  component: IncidentsPage,
})
const t = getTranslations()

function IncidentsPage() {
  return <h1 className="text-2xl font-bold">{t.sidebar_incidents()}</h1>
}
