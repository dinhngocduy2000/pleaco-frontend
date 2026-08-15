import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router'
import { AuthLayout } from '@/components/layouts/auth_layout'
import { KEY_STORAGE } from '@/enum/key-storage'
import { ROUTES } from '@/enum/routes'

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  if (!localStorage.getItem(KEY_STORAGE.IS_LOGGED_IN)) {
    return <Navigate to={ROUTES.LOGIN as string} />
  }
  return (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  )
}
