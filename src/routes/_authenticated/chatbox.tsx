import { createFileRoute } from '@tanstack/react-router'
import { getTranslations } from '@/lib/translation'

export const Route = createFileRoute('/_authenticated/chatbox')({ component: ChatboxPage })

const t = getTranslations()

function ChatboxPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">{t.sidebar_chatbox()}</h1>
    </div>
  )
}
