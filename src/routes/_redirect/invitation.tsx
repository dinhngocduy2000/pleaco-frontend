import { createFileRoute, Navigate } from '@tanstack/react-router'
import { KEY_STORAGE } from '@/enum/key-storage'
import { ROUTES } from '@/enum/routes'

export const Route = createFileRoute('/_redirect/invitation')({
  component: RouteComponent,
  validateSearch: (search) => ({
    invitation_id: typeof search.invitation_id === 'string' ? search.invitation_id : undefined,
  }),
})

function RouteComponent() {
  const search = Route.useSearch()
  localStorage.setItem(KEY_STORAGE.INVITATION_ID, search.invitation_id ?? '')
  return <Navigate to={ROUTES.HOME as string} />
}
