import { createFileRoute } from '@tanstack/react-router'
import { getTranslations } from '@/lib/translation'

export const Route = createFileRoute('/_authenticated/instructions')({
  component: InstructionsPage,
})

const t = getTranslations()

function InstructionsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">{t.sidebar_instructions()}</h1>
    </div>
  )
}
