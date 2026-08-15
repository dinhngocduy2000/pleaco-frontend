import { zodResolver } from '@hookform/resolvers/zod'
import type { AxiosError } from 'axios'
import { type Ref, useEffect, useImperativeHandle } from 'react'
import { type Resolver, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { ICreateGroupFormType } from '@/interface/groups'
import { getTranslations } from '@/lib/translation'
import { useCreateGroupMutation } from '@/queries/use-groups-query'
import { createGroupFormSchema } from '@/schemas/group-schemas'
import type { CreateGroupFormHandle } from './create-group-dialog'

const t = getTranslations()

type UseCreateGroupFormParams = {
  ref?: Ref<CreateGroupFormHandle>
  closeModal: () => void
  onFormStateChange?: (state: { isValid: boolean; isPending: boolean; isDirty: boolean }) => void
}

export function useCreateGroupForm({
  ref,
  closeModal,
  onFormStateChange,
}: UseCreateGroupFormParams) {
  const form = useForm<ICreateGroupFormType>({
    mode: 'onChange',
    resolver: zodResolver(createGroupFormSchema() as never) as Resolver<ICreateGroupFormType>,
    defaultValues: {
      name: '',
      description: '',
    },
  })

  const {
    formState: { isValid, isDirty },
    handleSubmit,
  } = form

  const { mutateAsync, isPending } = useCreateGroupMutation({
    onSuccess: () => {
      form.reset()
      toast.success(t.create_group_success())
      closeModal()
    },
    onError: (error) => {
      const axiosError = error as AxiosError<{ detail: string }>
      const message = axiosError?.response?.data?.detail || t.create_group_error()
      toast.error(message)
    },
  })

  const onSubmit = (data: ICreateGroupFormType) => {
    mutateAsync({
      name: data.name,
      description: data.description || null,
    })
  }

  useImperativeHandle(ref, () => ({
    submit: handleSubmit(onSubmit),
  }))

  useEffect(() => {
    onFormStateChange?.({ isValid, isPending, isDirty })
  }, [isValid, isPending, isDirty, onFormStateChange])

  return { form, onSubmit, handleSubmit }
}
