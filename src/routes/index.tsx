import { createFileRoute } from '@tanstack/react-router'
import { Circle, Layer, Stage } from 'react-konva'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
      <section className="max-w-xl space-y-6 text-center">
        <div><p className="text-sm font-medium text-muted-foreground">Welcome to</p><h1 className="text-5xl font-bold">Pleaco</h1></div>
        <p className="text-muted-foreground">React, TanStack Router, Vite, and React Konva are ready.</p>
        <Stage aria-label="Pleaco canvas preview" className="mx-auto" height={120} width={240}><Layer><Circle fill="#6366f1" radius={40} x={120} y={60} /></Layer></Stage>
      </section>
    </main>
  )
}
