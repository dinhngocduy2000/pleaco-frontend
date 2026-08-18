import dayjs from 'dayjs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { GroupMemberOrderBy, GroupMemberOrderDirection, type GroupRoleType } from '@/enum/group'
import type { UserStatusType } from '@/enum/users'
import type { IGroupMemberListRequest } from '@/interface/groups'
import { getCurrentLanguage, getTranslations } from '@/lib/translation'
import { useProfileQuery } from '@/queries/use-auth-query'
import { useGroupMembersQuery } from '@/queries/use-groups-query'
import 'dayjs/locale/vi'
import { useNavigate } from '@tanstack/react-router'
import { PencilIcon, Trash2Icon, UserIcon } from 'lucide-react'
import { useMemo } from 'react'
import { Route } from '../tenant-settings'
import { GroupMembersPagination } from './-group-members-pagination'

const t = getTranslations()
const PAGE_SIZE = 10

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
}

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
    enabled: Boolean(memberParams),
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
                const avatarSrc = member.image_url?.trim() || undefined
                return (
                  <TableRow key={member.member_id}>
                    <TableCell className="text-center">
                      {(currentPage - 1) * PAGE_SIZE + index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-4 pl-12">
                        <Avatar className="size-9">
                          {avatarSrc ? <AvatarImage src={avatarSrc} alt={member.name} /> : null}
                          <AvatarFallback delayMs={avatarSrc ? 200 : 0}>
                            {getInitials(member.name) || <UserIcon className="size-4" />}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{member.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center capitalize">{member.role}</TableCell>
                    <TableCell className="text-center">
                      {dayjs(member.joined_at).locale(getCurrentLanguage()).format('MM/DD/YYYY')}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-1">
                        <Button
                          aria-label={t.group_members_edit_coming_soon()}
                          disabled
                          size="icon-sm"
                          title={t.group_members_edit_coming_soon()}
                          variant="ghost"
                        >
                          <PencilIcon />
                        </Button>
                        <Button
                          aria-label={t.group_members_delete_coming_soon()}
                          className="text-destructive"
                          disabled
                          size="icon-sm"
                          title={t.group_members_delete_coming_soon()}
                          variant="ghost"
                        >
                          <Trash2Icon />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
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
