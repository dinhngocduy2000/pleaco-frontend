import { createFileRoute } from '@tanstack/react-router'
import { getTranslations } from '@/lib/translation'

export const Route = createFileRoute('/_authenticated/management/fleets')({ component: FleetsPage })
const t = getTranslations()

function FleetsPage() {
  return <h1 className="text-2xl font-bold">{t.sidebar_fleets()}</h1>
}
