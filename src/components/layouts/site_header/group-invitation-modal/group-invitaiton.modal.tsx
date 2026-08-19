import AppLogoWithoutText from '@/assets/svgs/app-logo-without-text'
import { TypographyH2, TypographyP } from '@/components/ui/typography'
import { getTranslations } from '@/lib/translation'
import { useGetGroupInvitationQuery } from '@/queries/use-groups-query'

const t = getTranslations()
const GroupInvitationModal = () => {
  const { data: invitationInfo } = useGetGroupInvitationQuery()

  return (
    <div className="flex flex-col gap-6 pt-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <AppLogoWithoutText className="size-20" />
        <TypographyH2 className="text-xl font-semibold">
          {t.create_group_welcome_title()}
        </TypographyH2>
        <TypographyP className="text-sm text-muted-foreground whitespace-pre-wrap">
          {t.group_invitation_prefix()}
          <strong className="font-semibold text-foreground">
            {invitationInfo?.data?.group_name}
          </strong>
          {t.group_invitation_as()}
          <strong className="capitalize font-semibold text-foreground">
            {invitationInfo?.data?.role}
          </strong>
          {t.group_invitation_suffix()}
        </TypographyP>
      </div>
    </div>
  )
}

export default GroupInvitationModal
