import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import type { Dispatch, SetStateAction } from 'react'
import { type Resolver, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { AppSelectComponent } from '@/components/reusable/app-select-component/app-select-component'
import DialogFooterComponent from '@/components/reusable/dialog-footer/dialog-footer'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { GROUPS_ENDPOINTS } from '@/enum/endpoints'
import { GroupRole, type GroupRoleType, LIST_ROLES } from '@/enum/group'
import type { IInviteGroupMemberFormType } from '@/interface/groups'
import type { IAxiosError, IOption } from '@/interface/utils'
import { getTranslations } from '@/lib/translation'
import { getErrorMessage } from '@/lib/utils'
import { useProfileQuery } from '@/queries/use-auth-query'
import { useInviteGroupMembersMutation } from '@/queries/use-groups-query'
import { inviteGroupMemberFormSchema } from '@/schemas/group-schemas'
import { Route } from '../tenant-settings'

type GroupInviteMemberProps = {
  setOpen: Dispatch<SetStateAction<boolean>>
}

const t = getTranslations()

const roleOptions: IOption[] = LIST_ROLES.map((role) => ({
  label: `${role.charAt(0).toUpperCase()}${role.slice(1)}`,
  value: role,
}))

export default function GroupInviteMember({ setOpen }: GroupInviteMemberProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()
  const { data: profileResponse } = useProfileQuery()
  const groupId = profileResponse?.data.group_id
  const form = useForm<IInviteGroupMemberFormType>({
    mode: 'onChange',
    resolver: zodResolver(
      inviteGroupMemberFormSchema() as never,
    ) as Resolver<IInviteGroupMemberFormType>,
    defaultValues: {
      email: '',
      role: GroupRole.MEMBER,
    },
  })
  const {
    formState: { isValid },
    handleSubmit,
    reset,
  } = form

  const { mutateAsync: inviteMember, isPending } = useInviteGroupMembersMutation({
    onSuccess: () => {
      reset()
      setOpen(false)
      toast.success(t.group_invite_member_success())
      if (search.page === 1) {
        queryClient.invalidateQueries({ queryKey: [GROUPS_ENDPOINTS.LIST_MEMBERS] })
        return
      }

      queryClient.invalidateQueries({
        queryKey: [GROUPS_ENDPOINTS.LIST_MEMBERS],
        refetchType: 'none',
      })
      navigate({ search: (previous) => ({ ...previous, page: 1 }) })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error as IAxiosError) || t.group_invite_member_error())
    },
  })

  const onSubmit = async (data: IInviteGroupMemberFormType) => {
    if (!groupId) {
      toast.error(t.group_members_no_active_group())
      return
    }

    await inviteMember({
      group_id: groupId,
      members: [
        {
          email: data.email,
          role: data.role as GroupRoleType,
        },
      ],
    })
  }

  const selectedRole = roleOptions.find((option) => option.value === form.watch('role'))

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="gap-0.5">
                {t.group_invite_member_email_label()}
                <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  autoComplete="email"
                  placeholder={t.group_invite_member_email_placeholder()}
                  type="email"
                  required
                  autoFocus
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="gap-0.5">
                {t.group_invite_member_role_label()} <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <AppSelectComponent
                  className="w-full"
                  options={roleOptions}
                  placeholder={t.group_invite_member_role_placeholder()}
                  value={selectedRole}
                  onChange={(option) => field.onChange(option?.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooterComponent
          cancelButtonText={t.group_invite_member_cancel()}
          confirmButtonProps={{
            disabled: !groupId || !isValid || isPending,
            loading: isPending,
            type: 'button',
          }}
          confirmButtonText={t.group_invite_member_submit()}
          onCancel={() => setOpen(false)}
          onConfirm={handleSubmit(onSubmit)}
        />
      </form>
    </Form>
  )
}
