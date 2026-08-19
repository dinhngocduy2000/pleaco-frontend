import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  GroupMemberOrderBy,
  GroupMemberOrderDirection,
  GroupRole,
  type GroupRoleType,
} from '@/enum/group'
import type { UserStatusType } from '@/enum/users'
import type { IGroupMemberListRequest } from '@/interface/groups'
import { getTranslations } from '@/lib/translation'
import { useProfileQuery } from '@/queries/use-auth-query'
import { useGroupMembersQuery } from '@/queries/use-groups-query'
import 'dayjs/locale/vi'
import { useNavigate } from '@tanstack/react-router'
import { useMemo } from 'react'
import { Route } from '../tenant-settings'
import { GroupMembersPagination } from './-group-members-pagination'
import GroupMembersTableRowComponent from './-group-members-table.row'

const t = getTranslations()
const PAGE_SIZE = 10

export function GroupMembersTable() {
  const search = Route.useSearch()
  const { data: profileResponse } = useProfileQuery()
  const groupId = profileResponse?.data.group_id
  const navigate = useNavigate({ from: Route.fullPath })

  const memberParams = useMemo<IGroupMemberListRequest | undefined>(() => {
    if (!groupId) return undefined

    return {
      group_id: groupId,
      page: search.page,
      page_size: PAGE_SIZE,
      order_by: GroupMemberOrderBy.JOINED_DATE,
      order_direction: search.order_direction,
      email: search.email || undefined,
      role: search.role as GroupRoleType | undefined,
      status: search.status as UserStatusType | undefined,
    }
  }, [groupId, search.email, search.order_direction, search.page, search.role, search.status])
  const {
    data: membersResponse,
    isError,
    isLoading,
  } = useGroupMembersQuery({
    params: memberParams ?? {
      group_id: '',
      page: 1,
      page_size: PAGE_SIZE,
      order_by: GroupMemberOrderBy.JOINED_DATE,
      order_direction: GroupMemberOrderDirection.DESC,
    },
    enabled:
      Boolean(memberParams) &&
      [GroupRole.ADMIN, GroupRole.OWNER].includes(
        profileResponse?.data?.group?.role as GroupRoleType,
      ),
  })
  const setPage = (page: number) => {
    navigate({ search: (previous) => ({ ...previous, page }) })
  }
  const members = membersResponse?.items ?? []
  const total = membersResponse?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.min(search.page, totalPages)

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t.group_members_loading()}</p>
  }
  if (!groupId) {
    return <p className="text-sm text-muted-foreground">{t.group_members_no_active_group()}</p>
  }
  return (
    <>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">{t.group_members_table_index()}</TableHead>
              <TableHead className="pl-16">{t.group_members_table_member()}</TableHead>
              <TableHead className="text-center">{t.group_members_table_role()}</TableHead>
              <TableHead className="text-center">{t.group_invitation_status()}</TableHead>
              <TableHead className="text-center">{t.group_members_table_joined()}</TableHead>
              <TableHead className="text-center">{t.group_members_table_actions()}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  {t.group_members_loading()}
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-destructive">
                  {t.group_members_error()}
                </TableCell>
              </TableRow>
            ) : members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  {t.group_members_empty()}
                </TableCell>
              </TableRow>
            ) : (
              members.map((member, index) => {
                return (
                  <GroupMembersTableRowComponent
                    member={member}
                    key={member.member_id}
                    index={(currentPage - 1) * PAGE_SIZE + index + 1}
                  />
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
      <GroupMembersPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </>
  )
}
