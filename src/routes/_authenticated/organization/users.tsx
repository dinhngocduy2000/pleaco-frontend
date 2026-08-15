import { createFileRoute } from '@tanstack/react-router'
import { getTranslations } from '@/lib/translation'

export const Route = createFileRoute('/_authenticated/organization/users')({ component: UsersPage })
const t = getTranslations()

function UsersPage() {
  return <h1 className="text-2xl font-bold">{t.sidebar_users()}</h1>
}
