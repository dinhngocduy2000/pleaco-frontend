import { createFileRoute } from '@tanstack/react-router'
import { getTranslations } from '@/lib/translation'

export const Route = createFileRoute('/_authenticated/settings')({ component: SettingsPage })

const t = getTranslations()

function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">{t.header_settings()}</h1>
    </div>
  )
}
