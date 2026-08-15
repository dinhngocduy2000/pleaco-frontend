import { createFileRoute } from '@tanstack/react-router'
import { getTranslations } from '@/lib/translation'

export const Route = createFileRoute('/_authenticated/operations/robots')({ component: RobotsPage })
const t = getTranslations()

function RobotsPage() {
  return <h1 className="text-2xl font-bold">{t.sidebar_robots()}</h1>
}
