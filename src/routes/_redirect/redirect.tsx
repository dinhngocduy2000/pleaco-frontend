import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_redirect/redirect')({
  component: RouteComponent,
})

function RouteComponent() {
  return null
}
