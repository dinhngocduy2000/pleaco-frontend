import { createFileRoute } from '@tanstack/react-router'
import { getTranslations } from '@/lib/translation'

export const Route = createFileRoute('/_authenticated/saved-destinations')({
  component: SavedDestinationsPage,
})

const t = getTranslations()

function SavedDestinationsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">{t.sidebar_saved_destinations()}</h1>
    </div>
  )
}
