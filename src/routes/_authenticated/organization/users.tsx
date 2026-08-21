import { createFileRoute } from '@tanstack/react-router'
import { GroupMemberOrderDirection } from '@/enum/group'
import { getTranslations } from '@/lib/translation'
import { GroupMembersTable } from './components/users/-group-members-table'
import { GroupMembersToolbar } from './components/users/-group-members-toolbar'

const parsePage = (value: unknown) => {
  const page = typeof value === 'number' ? value : Number(value)

  return Number.isInteger(page) && page > 0 ? page : 1
}

const parseOptionalString = (value: unknown) => (typeof value === 'string' ? value : undefined)

const parseOrderDirection = (value: unknown) =>
  value === GroupMemberOrderDirection.ASC || value === GroupMemberOrderDirection.DESC
    ? value
    : GroupMemberOrderDirection.DESC

export const Route = createFileRoute('/_authenticated/organization/users')({
  component: UsersPage,
  validateSearch: (search) => ({
    page: parsePage(search.page),
    email: parseOptionalString(search.email),
    role: parseOptionalString(search.role),
    status: parseOptionalString(search.status),
    order_direction: parseOrderDirection(search.order_direction),
  }),
})
const translation = getTranslations()

function UsersPage() {
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">{translation.group_members_settings()}</h1>
      <GroupMembersToolbar />
      <GroupMembersTable />
    </section>
  )
}
