import { createFileRoute } from '@tanstack/react-router'
import { getTranslations } from '@/lib/translation'

export const Route = createFileRoute('/_authenticated/operations/live-monitoring')({
  component: LiveMonitoringPage,
})
const t = getTranslations()

function LiveMonitoringPage() {
  return <h1 className="text-2xl font-bold">{t.sidebar_live_monitoring()}</h1>
}
