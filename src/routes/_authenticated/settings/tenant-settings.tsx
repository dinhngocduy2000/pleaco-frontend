import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { GroupMemberOrderDirection } from '@/enum/group'
import { getTranslations } from '@/lib/translation'
import { GroupMembersTable } from './components/-group-members-table'
import { GroupMembersToolbar } from './components/-group-members-toolbar'

const tenantSettingsSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  email: z.string().optional(),
  role: z.string().optional(),
  status: z.string().optional(),
  order_direction: z.enum(['asc', 'desc']).catch(GroupMemberOrderDirection.DESC),
})

export const Route = createFileRoute('/_authenticated/settings/tenant-settings')({
  validateSearch: tenantSettingsSearchSchema,
  component: TenantSettingsPage,
})

const translation = getTranslations()

function TenantSettingsPage() {
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">{translation.group_members_settings()}</h1>
      <GroupMembersToolbar />
      <GroupMembersTable />
    </section>
  )
}
