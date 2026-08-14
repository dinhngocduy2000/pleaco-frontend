import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/')({ component: HomePage })

function HomePage() {
  return (
    <main className="min-h-screen w-full bg-background">
      <p>To be implemented</p>
    </main>
  )
}
