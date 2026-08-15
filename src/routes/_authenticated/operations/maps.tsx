import { createFileRoute } from '@tanstack/react-router'
import { getTranslations } from '@/lib/translation'

export const Route = createFileRoute('/_authenticated/operations/maps')({ component: MapsPage })
const t = getTranslations()

function MapsPage() {
  return <h1 className="text-2xl font-bold">{t.sidebar_maps()}</h1>
}
