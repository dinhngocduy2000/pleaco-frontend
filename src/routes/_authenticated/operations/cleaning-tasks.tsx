import { createFileRoute } from '@tanstack/react-router'
import { getTranslations } from '@/lib/translation'

export const Route = createFileRoute('/_authenticated/operations/cleaning-tasks')({
  component: CleaningTasksPage,
})
const t = getTranslations()

function CleaningTasksPage() {
  return <h1 className="text-2xl font-bold">{t.sidebar_cleaning_tasks()}</h1>
}
