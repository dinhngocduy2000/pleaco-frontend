import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router'
import { GuestLayout } from '@/components/layouts/guest_layout/guest_layout'
import { KEY_STORAGE } from '@/enum/key-storage'
import { ROUTES } from '@/enum/routes'

export const Route = createFileRoute('/_guest')({
  component: GuestLayoutRoute,
})

function GuestLayoutRoute() {
  if (localStorage.getItem(KEY_STORAGE.IS_LOGGED_IN)) {
    return <Navigate to={ROUTES.HOME as string} />
  }
  return (
    <GuestLayout>
      <Outlet />
    </GuestLayout>
  )
}
