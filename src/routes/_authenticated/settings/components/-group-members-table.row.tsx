import dayjs from 'dayjs'
import { PencilIcon, Trash2Icon, UserIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import { INVITATION_STATUS, type InvitationStatusType } from '@/enum/group'
import type { IGroupMemberListInfo } from '@/interface/groups'
import { getCurrentLanguage, getTranslations } from '@/lib/translation'

type Props = {
  member: IGroupMemberListInfo
  index: number
}
const t = getTranslations()

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
}

const GroupMembersTableRowComponent = ({ member, index }: Props) => {
  const invitationStatusBadge: Record<InvitationStatusType, ReactNode> = {
    [INVITATION_STATUS.PENDING]: (
      <Badge className="bg-yellow-50 border-yellow-700! text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300">
        {t.group_members_invitation_pending()}
      </Badge>
    ),
    [INVITATION_STATUS.ACCEPTED]: (
      <Badge className="bg-green-50 border-green-700! text-green-700 dark:bg-green-950 dark:text-green-300">
        {t.group_members_invitation_accepted()}
      </Badge>
    ),
    [INVITATION_STATUS.REJECTED]: (
      <Badge className="bg-red-50 border-red-700! text-red-700 dark:bg-red-950 dark:text-red-300">
        {t.group_members_invitation_rejected()}
      </Badge>
    ),
  }
  const avatarSrc = member.image_url?.trim() || undefined
  return (
    <TableRow key={member.member_id}>
      <TableCell className="text-center">{index}</TableCell>
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
      <TableCell className="text-center capitalize">
        {invitationStatusBadge[member.invitation_status]}
      </TableCell>
      <TableCell className="text-center">
        {dayjs(member.joined_at).locale(getCurrentLanguage()).format('MM/DD/YYYY')}
      </TableCell>
      <TableCell>
        <div className="flex justify-center gap-1">
          <Button
            aria-label={t.group_members_edit_coming_soon()}
            size="icon-sm"
            title={t.group_members_edit_coming_soon()}
            variant="ghost"
          >
            <PencilIcon />
          </Button>
          <Button
            aria-label={t.group_members_delete_coming_soon()}
            className="text-destructive"
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
}

export default GroupMembersTableRowComponent
