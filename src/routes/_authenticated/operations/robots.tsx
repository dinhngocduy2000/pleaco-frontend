import { createFileRoute } from '@tanstack/react-router'
import { getTranslations } from '@/lib/translation'
import { RobotsToolbar } from './components/robots/-robots-toolbar'

export const Route = createFileRoute('/_authenticated/operations/robots')({ component: RobotsPage })
const t = getTranslations()

function RobotsPage() {
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">{t.sidebar_robots()}</h1>
      <RobotsToolbar />
    </section>
  )
}
