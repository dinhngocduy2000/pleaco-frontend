import { createFileRoute } from '@tanstack/react-router'
import { getTranslations } from '@/lib/translation'

export const Route = createFileRoute('/_authenticated/admin/manage-group')({
  component: ManageGroupPage,
})

const t = getTranslations()

function ManageGroupPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">{t.sidebar_manage_group()}</h1>
    </div>
  )
}
