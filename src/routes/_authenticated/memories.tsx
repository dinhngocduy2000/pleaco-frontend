import { createFileRoute } from '@tanstack/react-router'
import { getTranslations } from '@/lib/translation'

export const Route = createFileRoute('/_authenticated/memories')({ component: MemoriesPage })

const t = getTranslations()

function MemoriesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">{t.sidebar_memories()}</h1>
    </div>
  )
}
