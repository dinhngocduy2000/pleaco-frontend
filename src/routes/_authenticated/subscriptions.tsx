import { createFileRoute } from '@tanstack/react-router'
import { getTranslations } from '@/lib/translation'

export const Route = createFileRoute('/_authenticated/subscriptions')({
  component: SubscriptionsPage,
})

const t = getTranslations()

function SubscriptionsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">{t.header_subscriptions()}</h1>
    </div>
  )
}
