import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_redirect')({
  component: RedirectRoute,
})

function RedirectRoute() {
  return <Outlet />
}
