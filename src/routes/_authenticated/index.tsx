import { createFileRoute } from '@tanstack/react-router'
import { getTranslations } from '@/lib/translation'

export const Route = createFileRoute('/_authenticated/')({ component: HomePage })

const t = getTranslations()

function HomePage() {
  return (
    <main>
      <h1 className="text-2xl font-bold">{t.sidebar_dashboard()}</h1>
    </main>
  )
}
