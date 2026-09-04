import { MoreVertical, PencilLine, Trash2, Unplug } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import AlertDialogComponent from '@/components/reusable/alert-dialog/app-alert-dialog'
import AppDropdownMenu from '@/components/reusable/app-dropdown-menu/dropdown-menu'
import { TypographySmall } from '@/components/ui/typography'
import type { IRobotInfo } from '@/interface/robots'
import type { IAxiosError } from '@/interface/utils'
import { getTranslations } from '@/lib/translation'
import { getErrorMessage } from '@/lib/utils'
import { useDeleteRobotMutation } from '@/queries/use-robots-query'

type Props = {
  robot: IRobotInfo
}
const t = getTranslations()
const BotActionsDropdown = ({ robot }: Props) => {
  const [openConfirmDelete, setOpenConfirmDelete] = useState<boolean>(false)
  const { mutateAsync: deleteRobot, isPending: isDeleting } = useDeleteRobotMutation({
    onSuccess: () => {
      setOpenConfirmDelete(false)
      toast.success(t.robot_delete_success({ name: robot.name }))
    },
    onError: (error) => {
      toast.error(getErrorMessage(error as IAxiosError))
    },
  })

  const handleConfirmDelete = async () => {
    await deleteRobot(robot.id)
  }

  return (
    <>
      <AppDropdownMenu
        triggerAriaLabel={`${t.robot_card_menu_label()}: ${robot.name}`}
        trigger={
          <>
            <MoreVertical aria-hidden="true" />
            <TypographySmall className="sr-only">{t.robot_card_menu_label()}</TypographySmall>
          </>
        }
        triggerVariant="ghost"
        items={[
          {
            label: (
              <>
                <Trash2 color="red" />
                {t.robot_card_menu_delete()}
              </>
            ),
            value: 'delete',
            onClick: () => {
              setOpenConfirmDelete(true)
            },
          },
          {
            label: (
              <>
                <Unplug className="text-amber-500" /> {t.robot_card_menu_deactivate()}
              </>
            ),
            value: 'deactivate',
            onClick: () => undefined,
          },
          {
            label: (
              <>
                <PencilLine color="purple" />
                {t.edit()}
              </>
            ),
            value: 'edit',
            onClick: () => undefined,
          },
        ]}
      />
      <AlertDialogComponent
        dialogTrigger={undefined}
        open={openConfirmDelete}
        setOpen={setOpenConfirmDelete}
        onConfirm={handleConfirmDelete}
        loading={isDeleting}
        text={t.robot_delete_description({ name: robot.name })}
        confirmText="Confirm"
      />
    </>
  )
}

export default BotActionsDropdown
