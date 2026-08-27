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
import { Textarea } from '@/components/ui/textarea'
import type { ICreateMapFormType } from '@/interface/maps'
import type { IAxiosError, IOption } from '@/interface/utils'
import { getTranslations } from '@/lib/translation'
import { getErrorMessage } from '@/lib/utils'
import { useProfileQuery } from '@/queries/use-auth-query'
import { useCreateMapMutation } from '@/queries/use-maps-query'
import { useTagsQuery } from '@/queries/use-tags-query'
import { createMapFormSchema } from '@/schemas/map-schemas'
import { MapGridPreview } from './-map-grid-preview'

type MapCreateModalProps = {
  setOpen: Dispatch<SetStateAction<boolean>>
}

const t = getTranslations()

export function MapCreateModal({ setOpen }: MapCreateModalProps) {
  const { data: profileResponse } = useProfileQuery()
  const { data: tagsResponse } = useTagsQuery()
  const groupId = profileResponse?.data.group_id
  const tagOptions = useMemo<IOption[]>(
    () => tagsResponse?.data.map((tag) => ({ label: tag.name, value: tag.id })) ?? [],
    [tagsResponse],
  )
  const form = useForm<ICreateMapFormType>({
    mode: 'onChange',
    resolver: zodResolver(createMapFormSchema() as never) as Resolver<ICreateMapFormType>,
    defaultValues: {
      name: '',
      description: '',
      dimension_x: undefined,
      dimension_y: undefined,
      robot_ids: [],
      tag_ids: [],
    },
  })
  const {
    formState: { isValid },
    handleSubmit,
    reset,
    watch,
  } = form
  const dimensionX = watch('dimension_x')
  const dimensionY = watch('dimension_y')
  const selectedTags = tagOptions.filter((option) => watch('tag_ids').includes(option.value))
  const { mutateAsync: createMap, isPending } = useCreateMapMutation({
    onSuccess: () => {
      reset()
      setOpen(false)
      toast.success(t.map_create_success())
    },
    onError: (error) => {
      toast.error(getErrorMessage(error as IAxiosError) || t.map_create_error())
    },
  })

  const handleSubmitMap = async (data: ICreateMapFormType) => {
    if (!groupId) {
      toast.error(t.map_create_no_active_group())
      return
    }

    await createMap({
      group_id: groupId,
      name: data.name,
      description: data.description || undefined,
      dimension_x: data.dimension_x,
      dimension_y: data.dimension_y,
      robot_ids: data.robot_ids,
      tags: data.tag_ids,
    })
  }

  return (
    <div className="flex min-h-0 flex-wrap h-full">
      <MapGridPreview dimensionX={dimensionX} dimensionY={dimensionY} />
      <div className="flex min-h-0 basis-full flex-col md:basis-1/2">
        <div className="flex items-start justify-between gap-4 px-6 pt-6">
          <div>
            <h2 className="text-2xl font-bold">{t.map_create_title()}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t.map_create_description()}</p>
          </div>
          <Button
            aria-label={t.map_create_close()}
            variant="ghost"
            size="icon"
            type="button"
            onClick={() => setOpen(false)}
          >
            <X className="size-8 stroke-1" />
          </Button>
        </div>
        <Form {...form}>
          <form
            onSubmit={handleSubmit(handleSubmitMap)}
            className="flex min-h-0 flex-1 flex-col p-4"
          >
            <div className="grid gap-4 overflow-y-auto px-6 py-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>
                      {t.map_create_name_label()} <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        autoFocus
                        maxLength={100}
                        placeholder={t.map_create_name_placeholder()}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dimension_x"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t.map_create_width_label()} <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        min="0"
                        step="any"
                        type="number"
                        placeholder="0"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dimension_y"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t.map_create_height_label()} <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        min="0"
                        step="any"
                        type="number"
                        placeholder="0"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="robot_ids"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>{t.map_create_robots_label()}</FormLabel>
                    <FormControl>
                      <AppSelectComponent
                        multiple
                        disabled
                        options={[]}
                        placeholder={t.map_create_robots_placeholder()}
                        value={[]}
                        onChange={(options) =>
                          field.onChange(options.map((option) => option.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tag_ids"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>{t.map_create_tags_label()}</FormLabel>
                    <FormControl>
                      <AppSelectComponent
                        multiple
                        options={tagOptions}
                        placeholder={t.map_create_tags_placeholder()}
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
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>{t.map_create_description_label()}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={t.map_create_description_placeholder()} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooterComponent
              cancelButtonText={t.map_create_cancel()}
              confirmButtonText={t.map_create_submit()}
              cancelButtonProps={{ disabled: isPending }}
              confirmButtonProps={{
                disabled: !isValid || isPending,
                loading: isPending,
                type: 'button',
              }}
              onCancel={() => setOpen(false)}
              onConfirm={handleSubmit(handleSubmitMap)}
            />
          </form>
        </Form>
      </div>
    </div>
  )
}
