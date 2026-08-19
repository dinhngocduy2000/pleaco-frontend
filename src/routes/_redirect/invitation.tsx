import { createFileRoute, Navigate } from '@tanstack/react-router'
import z from 'zod'
import { KEY_STORAGE } from '@/enum/key-storage'
import { ROUTES } from '@/enum/routes'

const invitationRedirectSearchSchema = z.object({
  invitation_id: z.string().optional(),
})
export const Route = createFileRoute('/_redirect/invitation')({
  component: RouteComponent,
  validateSearch: invitationRedirectSearchSchema,
})

function RouteComponent() {
  const search = Route.useSearch()
  localStorage.setItem(KEY_STORAGE.INVITATION_ID, search.invitation_id ?? '')
  return <Navigate to={ROUTES.HOME as string} />
}
