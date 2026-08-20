import { useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { PencilIcon, Trash2Icon, UserIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import AlertDialogComponent from '@/components/reusable/alert-dialog/app-alert-dialog'
import AppDialogComponent from '@/components/reusable/app-dialog/app-dialog-component'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import { GROUPS_ENDPOINTS } from '@/enum/endpoints'
import { INVITATION_STATUS } from '@/enum/group'
import type { IGroupMemberListInfo } from '@/interface/groups'
import { getCurrentLanguage, getTranslations } from '@/lib/translation'
import { useProfileQuery } from '@/queries/use-auth-query'
import { useDeleteMemberMutation } from '@/queries/use-groups-query'
import GroupEditMember from './-group-edit-member'
import GroupMemberInvitationStatusBadge from './-group-members-invitation-status'

type Props = {
  member: IGroupMemberListInfo
  index: number
  groupId: string
}
const t = getTranslations()

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
}

const GroupMembersTableRowComponent = ({ member, index, groupId }: Props) => {
  const [openConfirmDeleteModal, setOpenConfirmDeleteModal] = useState<boolean>(false)
  const selectedMember = useRef<IGroupMemberListInfo | null>(null)
  const queryClient = useQueryClient()
  const [openEditModal, setOpenEditModal] = useState<boolean>(false)
  const { data: profileResponse } = useProfileQuery()
  const { mutateAsync: deleteMember, isPending: isDeleting } = useDeleteMemberMutation({
    onSuccess: () => {
      toast.success(t.group_delete_member_success({ email: member.email }))
      queryClient.invalidateQueries({ queryKey: [GROUPS_ENDPOINTS.LIST_MEMBERS] })
      selectedMember.current = null
    },
  })

  const onDeleteMember = () => {
    selectedMember.current = member
    setOpenConfirmDeleteModal(true)
  }

  const onEditMember = () => {
    selectedMember.current = member
    setOpenEditModal(true)
  }
  const onConfirmDeleteMember = async () => {
    await deleteMember({ group_id: groupId, member_id: member.member_id })
  }
  const avatarSrc = member.image_url?.trim() || undefined
  return (
    <>
      <TableRow>
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
          <GroupMemberInvitationStatusBadge status={member.invitation_status} />
        </TableCell>
        <TableCell className="text-center">
          {dayjs(member.joined_at).locale(getCurrentLanguage()).format('MM/DD/YYYY')}
        </TableCell>
        <TableCell>
          <div className="flex justify-center gap-1">
            {profileResponse?.data.id !== member.member_id &&
              member.invitation_status === INVITATION_STATUS.ACCEPTED && (
                <Button
                  aria-label={t.group_members_edit()}
                  size="icon-sm"
                  title={t.group_members_edit()}
                  variant="ghost"
                  onClick={onEditMember}
                >
                  <PencilIcon />
                </Button>
              )}
            <Button
              aria-label={t.group_members_delete_coming_soon()}
              className="text-destructive"
              size="icon-sm"
              onClick={onDeleteMember}
              title={t.group_members_delete_coming_soon()}
              variant="ghost"
            >
              <Trash2Icon />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      <AlertDialogComponent
        dialogTrigger={undefined}
        open={openConfirmDeleteModal}
        setOpen={setOpenConfirmDeleteModal}
        onConfirm={onConfirmDeleteMember}
        loading={isDeleting}
        text={t.group_delete_member_description({ email: member.email })}
        confirmText="Confirm"
      />
      <AppDialogComponent
        dialogTrigger={null}
        footer={false}
        open={openEditModal}
        setOpen={setOpenEditModal}
        title={t.group_edit_member_title()}
      >
        {selectedMember.current ? (
          <GroupEditMember
            groupId={groupId}
            member={selectedMember.current}
            open={openEditModal}
            setOpen={setOpenEditModal}
          />
        ) : null}
      </AppDialogComponent>
    </>
  )
}

export default GroupMembersTableRowComponent
