import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { type Dispatch, type SetStateAction, useEffect } from 'react'
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
import { type GroupRoleType, LIST_ROLES } from '@/enum/group'
import type { IGroupMemberListInfo, IUpdateGroupMemberFormType } from '@/interface/groups'
import type { IAxiosError, IOption } from '@/interface/utils'
import { getTranslations } from '@/lib/translation'
import { getErrorMessage } from '@/lib/utils'
import { useUpdateMemberMutation } from '@/queries/use-groups-query'
import { updateGroupMemberFormSchema } from '@/schemas/group-schemas'

type GroupEditMemberProps = {
  groupId: string
  member: IGroupMemberListInfo
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
}

const t = getTranslations()

const roleOptions: IOption[] = LIST_ROLES.map((role) => ({
  label: `${role.charAt(0).toUpperCase()}${role.slice(1)}`,
  value: role,
}))

export default function GroupEditMember({ groupId, member, open, setOpen }: GroupEditMemberProps) {
  const queryClient = useQueryClient()
  const form = useForm<IUpdateGroupMemberFormType>({
    mode: 'onChange',
    resolver: zodResolver(
      updateGroupMemberFormSchema() as never,
    ) as Resolver<IUpdateGroupMemberFormType>,
    defaultValues: { role: member.role },
  })
  const {
    formState: { isDirty, isValid },
    handleSubmit,
    reset,
  } = form

  // useEffect(() => {
  //   if (open) reset({ role: member.role })
  // }, [member, open, reset])

  const { mutateAsync: updateMember, isPending } = useUpdateMemberMutation({
    onSuccess: () => {
      reset({ role: member.role })
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: [GROUPS_ENDPOINTS.LIST_MEMBERS] })
      toast.success(t.group_edit_member_success({ email: member.email }))
    },
    onError: (error) => {
      toast.error(getErrorMessage(error as IAxiosError))
    },
  })

  const handleSubmitEdit = async (data: IUpdateGroupMemberFormType) => {
    await updateMember({
      group_id: groupId,
      member_id: member.member_id,
      role: data.role as GroupRoleType,
    })
  }

  const selectedRole = roleOptions.find((option) => option.value === form.watch('role'))

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(handleSubmitEdit)} className="grid gap-4">
        <FormItem>
          <FormLabel>{t.group_invite_member_email_label()}</FormLabel>
          <FormControl>
            <Input type="email" value={member.email} disabled />
          </FormControl>
        </FormItem>
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
            disabled: !isDirty || !isValid || isPending,
            loading: isPending,
            type: 'button',
          }}
          confirmButtonText={t.group_edit_member_submit()}
          onCancel={() => setOpen(false)}
          onConfirm={handleSubmit(handleSubmitEdit)}
        />
      </form>
    </Form>
  )
}
