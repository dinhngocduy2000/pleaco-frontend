import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import CreateGroupForm, {
  type CreateGroupFormHandle,
} from '@/components/layouts/site_header/create-group-dialog/create-group-dialog'
import AppDialogComponent from '@/components/reusable/app-dialog/app-dialog-component'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { KEY_STORAGE } from '@/enum/key-storage'
import { UserStatus } from '@/enum/users'
import { getTranslations } from '@/lib/translation'
import { useProfileQuery, useTrackSessionQuery } from '@/queries/use-auth-query'
import { useAcceptGroupInvitationMutation } from '@/queries/use-groups-query'
import { ProfileDropdownComponent } from '../profile_dropdown_component'
import GroupInvitationModal from './group-invitation-modal/group-invitaiton.modal'
import SelectGroupDropdown from './select-group-dropdown/select-group-dropdown'

const t = getTranslations()

export function SiteHeader() {
  useTrackSessionQuery()
  const [createGroupDialogOpen, setCreateGroupDialogOpen] = useState<boolean>(false)
  const [openInvitationDialog, setOpenInvitationDialog] = useState<boolean>(false)
  const { data: profileResponse } = useProfileQuery()
  const user = profileResponse?.data
  const formRef = useRef<CreateGroupFormHandle>(null)
  const isFormDirtyRef = useRef(false)
  const [formState, setFormState] = useState({ isValid: false, isPending: false, isDirty: false })
  const { mutateAsync: acceptInvite, isPending: isAcceptionInvitation } =
    useAcceptGroupInvitationMutation({
      onSuccess: () => {
        toast.success(t.group_invitation_accept())
        setOpenInvitationDialog(false)
      },
    })
  const handleAcceptInvitation = async () => {
    await acceptInvite()
  }
  const handleFormStateChange = useCallback(
    (state: { isValid: boolean; isPending: boolean; isDirty: boolean }) => {
      isFormDirtyRef.current = state.isDirty
      setFormState(state)
    },
    [],
  )

  useEffect(
    function openCreateGroupDialog() {
      const invitationID = localStorage.getItem(KEY_STORAGE.INVITATION_ID)
      if (invitationID) {
        setOpenInvitationDialog(true)
        return
      }
      if (
        profileResponse?.data?.status === UserStatus.PENDING ||
        (profileResponse && !profileResponse?.data?.group_id)
      ) {
        setCreateGroupDialogOpen(true)
      }
    },
    [profileResponse],
  )

  return (
    <>
      <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
        <SelectGroupDropdown />
        <ProfileDropdownComponent user={user} />
      </header>

      <AppDialogComponent
        open={createGroupDialogOpen}
        setOpen={setCreateGroupDialogOpen}
        dialogTrigger={null}
        header={false}
        confirmButtonText="Get Started"
        confirmButtonProps={{
          disabled: !formState.isValid || formState.isPending,
          loading: formState.isPending,
          className: 'w-full',
        }}
        cancelButtonProps={{ className: 'hidden' }}
        onConfirm={formRef.current?.submit}
        isFormDirtyRef={isFormDirtyRef}
        disableClickOverlay
      >
        <CreateGroupForm
          ref={formRef}
          closeModal={() => setCreateGroupDialogOpen(false)}
          onFormStateChange={handleFormStateChange}
        />
      </AppDialogComponent>
      <AppDialogComponent
        open={openInvitationDialog}
        setOpen={setOpenInvitationDialog}
        dialogTrigger={null}
        header={false}
        confirmButtonText="Accept"
        confirmButtonProps={{
          disabled: isAcceptionInvitation,
          loading: isAcceptionInvitation,
          style: {
            marginRight: 'auto',
          },
        }}
        cancelButtonText="Reject"
        cancelButtonProps={{
          variant: 'secondary',
          style: {
            marginLeft: 'auto',
            backgroundColor: '#f2cbcb',
            color: 'red',
          },
        }}
        onConfirm={handleAcceptInvitation}
        isFormDirtyRef={isFormDirtyRef}
        disableClickOverlay
        onCancel={() => {}}
      >
        <GroupInvitationModal />
      </AppDialogComponent>
    </>
  )
}
