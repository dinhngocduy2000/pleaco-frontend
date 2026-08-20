import { Badge } from '@/components/ui/badge'
import { INVITATION_STATUS, type InvitationStatusType } from '@/enum/group'
import { getTranslations } from '@/lib/translation'

type Props = {
  status: InvitationStatusType
}
const t = getTranslations()
const GroupMemberInvitationStatusBadge = ({ status }: Props) => {
  if (status === INVITATION_STATUS.PENDING) {
    return (
      <Badge className="bg-yellow-50 border-yellow-700! text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300">
        {t.group_members_invitation_pending()}
      </Badge>
    )
  }
  if (status === INVITATION_STATUS.REJECTED) {
    return (
      <Badge className="bg-red-50 border-red-700! text-red-700 dark:bg-red-950 dark:text-red-300">
        {t.group_members_invitation_rejected()}
      </Badge>
    )
  }
  return (
    <Badge className="bg-green-50 border-green-700! text-green-700 dark:bg-green-950 dark:text-green-300">
      {t.group_members_invitation_accepted()}
    </Badge>
  )
}

export default GroupMemberInvitationStatusBadge
