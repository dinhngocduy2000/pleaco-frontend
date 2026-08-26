import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import { type Dispatch, type SetStateAction, useMemo } from 'react'
import { type Resolver, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { AppSelectComponent } from '@/components/reusable/app-select-component/app-select-component'
import DialogFooterComponent from '@/components/reusable/dialog-footer/dialog-footer'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { LIST_ROBOT_MODELS, RobotModel, type RobotModelType } from '@/enum/robot'
import type { ICreateRobotFormType } from '@/interface/robots'
import type { IAxiosError, IOption } from '@/interface/utils'
import { getTranslations } from '@/lib/translation'
import { getErrorMessage } from '@/lib/utils'
import { useProfileQuery } from '@/queries/use-auth-query'
import { useCreateRobotMutation } from '@/queries/use-robots-query'
import { useTagsQuery } from '@/queries/use-tags-query'
import { createRobotFormSchema } from '@/schemas/robot-schemas'
import RobotImageByModel from './-robot-img-model'

type CreateRobotDialogProps = {
  setOpen: Dispatch<SetStateAction<boolean>>
}

const t = getTranslations()

const robotModelOptions: IOption[] = LIST_ROBOT_MODELS.map((model) => ({
  label: `${model.charAt(0)}${model.slice(1).toLowerCase()}`,
  value: model,
}))

export function CreateRobotDialog({ setOpen }: CreateRobotDialogProps) {
  const { data: profileResponse } = useProfileQuery()
  const groupId = profileResponse?.data.group_id
  const { data: listTagResponse } = useTagsQuery()
  const form = useForm<ICreateRobotFormType>({
    mode: 'onChange',
    resolver: zodResolver(createRobotFormSchema() as never) as Resolver<ICreateRobotFormType>,
    defaultValues: {
      name: '',
      serial_num: '',
      model: RobotModel.STANDARD,
      map_id: undefined,
      ip_address: '',
      tags: [],
    },
  })
  const tagOptions: IOption[] = useMemo(
    () =>
      listTagResponse?.data?.map((tag) => ({
        value: tag.id,
        label: tag.name,
      })) ?? [],
    [listTagResponse],
  )
  const {
    formState: { isValid },
    handleSubmit,
    reset,
    watch,
  } = form

  const { mutateAsync: createRobot, isPending } = useCreateRobotMutation({
    onSuccess: () => {
      reset()
      setOpen(false)
      toast.success(t.robot_create_success())
    },
    onError: (error) => {
      toast.error(getErrorMessage(error as IAxiosError) || t.robot_create_error())
    },
  })

  const onSubmit = async (data: ICreateRobotFormType) => {
    if (!groupId) {
      toast.error(t.robot_create_no_active_group())
      return
    }

    await createRobot({
      group_id: groupId,
      name: data.name,
      serial_num: data.serial_num,
      model: data.model,
      map_id: data.map_id ?? null,
      ip_address: data.ip_address,
      tags: data.tags,
    })
  }

  const selectedModel = robotModelOptions.find((option) => option.value === watch('model'))
  const selectedTags = tagOptions.filter((option) => watch('tags').includes(option.value))
  const footerDisabled = !isValid || isPending
  return (
    <div className="grid min-h-0 md:grid-cols-2 lg:h-full">
      <div className="min-h-56 overflow-hidden bg-muted md:min-h-full">
        <RobotImageByModel
          model={(selectedModel?.value as RobotModelType) ?? RobotModel.STANDARD}
        />
      </div>
      <div className="flex min-h-0 flex-col md:col-span-1">
        <div className="flex items-start justify-between gap-4 px-6 pt-6">
          <div>
            <h2 className="text-2xl font-bold">{t.robot_create_title()}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t.robot_create_description()}</p>
          </div>
          <Button
            aria-label="Close"
            variant="ghost"
            size="icon"
            type="button"
            onClick={() => setOpen(false)}
          >
            <X className="size-8 font-light stroke-1" />
          </Button>
        </div>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col p-4">
            <div className="grid gap-4 overflow-y-auto px-6 py-6 sm:grid-cols-2">
              <p className="sm:col-span-2 text-xs font-semibold tracking-wider text-primary uppercase">
                {t.robot_create_identity_section()}
              </p>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t.robot_create_name_label()} <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        autoFocus
                        maxLength={50}
                        placeholder={t.robot_create_name_placeholder()}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="serial_num"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t.robot_create_serial_label()} <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        maxLength={50}
                        placeholder={t.robot_create_serial_placeholder()}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <p className="sm:col-span-2 pt-2 text-xs font-semibold tracking-wider text-primary uppercase">
                {t.robot_create_configuration_section()}
              </p>
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t.robot_create_model_label()} <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <AppSelectComponent
                        options={robotModelOptions}
                        placeholder={t.robot_create_model_placeholder()}
                        value={selectedModel}
                        onChange={(option) => field.onChange(option?.value as RobotModelType)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="map_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.robot_create_map_label()}</FormLabel>
                    <FormControl>
                      <AppSelectComponent
                        options={[]}
                        placeholder={t.robot_create_map_placeholder()}
                        value={undefined}
                        onChange={(option) => field.onChange(option?.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <p className="sm:col-span-2 pt-2 text-xs font-semibold tracking-wider text-primary uppercase">
                {t.robot_create_connectivity_section()}
              </p>
              <FormField
                control={form.control}
                name="ip_address"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>
                      {t.robot_create_ip_label()} <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder={t.robot_create_ip_placeholder()} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>{t.robot_create_tags_label()}</FormLabel>
                    <FormControl>
                      <AppSelectComponent
                        multiple
                        options={tagOptions}
                        placeholder={t.robot_create_tags_placeholder()}
                        value={selectedTags}
                        onChange={(options) =>
                          field.onChange(options.map((option) => option.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooterComponent
              cancelButtonText={t.robot_create_cancel()}
              confirmButtonText={t.robot_create_submit()}
              cancelButtonProps={{ disabled: isPending }}
              confirmButtonProps={{
                disabled: footerDisabled,
                loading: isPending,
                type: 'button',
              }}
              onCancel={() => setOpen(false)}
              onConfirm={handleSubmit(onSubmit)}
            />
          </form>
        </Form>
      </div>
    </div>
  )
}
