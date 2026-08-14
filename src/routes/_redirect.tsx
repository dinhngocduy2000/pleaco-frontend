import { createFileRoute, Navigate } from '@tanstack/react-router'
import { KEY_STORAGE } from '@/enum/key-storage'
import { ROUTES } from '@/enum/routes'

export const Route = createFileRoute('/_redirect')({
  component: RedirectRoute,
})

function RedirectRoute() {
  localStorage.setItem(KEY_STORAGE.IS_SAVE_SESSION, 'true')
  localStorage.setItem(KEY_STORAGE.IS_LOGGED_IN, 'true')
  return <Navigate to={ROUTES.HOME as string} />
}
