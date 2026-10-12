import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { Pencil } from 'lucide-react'
import { type Dispatch, type SetStateAction, useId, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import AppDialogComponent from '@/components/reusable/app-dialog/app-dialog-component'
import { AppSelectComponent } from '@/components/reusable/app-select-component/app-select-component'
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
import type { IMapDetailInfo, IUpdateMapMetadataFormType } from '@/interface/maps'
import type { IAxiosError, IOption } from '@/interface/utils'
import { getTranslations } from '@/lib/translation'
import { getErrorMessage } from '@/lib/utils'
import { useUpdateMapMetadataMutation } from '@/queries/use-maps-query'
import { useTagsQuery } from '@/queries/use-tags-query'
import { updateMapMetadataFormSchema } from '@/schemas/map-schemas'

const t = getTranslations()

type MapMetadataDialogProps = { map: IMapDetailInfo }

export function MapMetadataDialog({ map }: MapMetadataDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Pencil aria-hidden="true" />
        {t.map_detail_edit_metadata()}
      </Button>
      {open && <MapMetadataEditor map={map} setOpen={setOpen} open={open} />}
    </>
  )
}

function MapMetadataEditor({
  map,
  setOpen,
  open,
}: MapMetadataDialogProps & {
  setOpen: Dispatch<SetStateAction<boolean>>
  open: boolean
}) {
  const formId = useId()
  const submitting = useRef(false)
  const { data: tagsResponse, isError: tagsError, isLoading: tagsLoading } = useTagsQuery()
  const form = useForm<IUpdateMapMetadataFormType>({
    mode: 'onChange',
    resolver: zodResolver(updateMapMetadataFormSchema()),
    defaultValues: {
      name: map.name,
      description: map.description ?? '',
      tags: map.tags.map((tag) => tag.id),
    },
  })
  const { mutateAsync, isPending } = useUpdateMapMetadataMutation()
  const { isDirty, isValid, isSubmitting } = form.formState
  const saving = isPending || isSubmitting
  const { options, tagOptions } = useMemo(() => {
    const options = new Map<string, IOption>(
      [...map.tags, ...(tagsResponse?.data ?? [])].map((tag) => [
        tag.id,
        { value: tag.id, label: tag.name },
      ]),
    )
    return { options, tagOptions: [...options.values()] }
  }, [map.tags, tagsResponse?.data])

  const submit = async (values: IUpdateMapMetadataFormType) => {
    if (!isDirty || submitting.current) return
    submitting.current = true
    try {
      await mutateAsync({
        map_id: map.id,
        name: values.name,
        description: values.description ?? '',
        tags: values.tags ?? [],
      })
      toast.success(t.map_metadata_save_success())
      setOpen(false)
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 400) {
        form.setError('name', { type: 'server', message: t.map_metadata_name_exists() })
      } else {
        toast.error(getErrorMessage(error as IAxiosError) || t.map_metadata_save_error())
      }
    } finally {
      submitting.current = false
    }
  }

  return (
    <AppDialogComponent
      open={open}
      setOpen={(next) => {
        if (!submitting.current && !saving) setOpen(next)
      }}
      dialogTrigger={null}
      title={t.map_detail_edit_metadata()}
      disableClickOverlay={saving}
      cancelButtonText={t.map_metadata_cancel()}
      cancelButtonProps={{ disabled: saving }}
      confirmButtonText={t.map_metadata_save()}
      confirmButtonProps={{
        'aria-label': t.map_metadata_save(),
        type: 'submit',
        form: formId,
        disabled: !isDirty || !isValid || saving,
        loading: saving,
      }}
      dialogProps={{ 'aria-describedby': undefined }}
    >
      <Form {...form}>
        <form id={formId} onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t.map_metadata_name()}{' '}
                  <span aria-hidden="true" className="text-destructive">
                    *
                  </span>
                </FormLabel>
                <FormControl>
                  <Input {...field} disabled={saving} aria-required="true" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.map_create_description_label()}</FormLabel>
                <FormControl>
                  <Textarea {...field} value={field.value ?? ''} disabled={saving} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tags"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.map_create_tags_label()}</FormLabel>
                <AppSelectComponent
                  multiple
                  searchable
                  ariaLabel={t.map_create_tags_label()}
                  placeholder={t.map_create_tags_placeholder()}
                  options={tagOptions}
                  value={(field.value ?? []).flatMap((id) => {
                    const option = options.get(id)
                    return option ? [option] : []
                  })}
                  onChange={(selected) => field.onChange(selected.map((option) => option.value))}
                  disabled={saving || tagsLoading || tagsError}
                />
                {tagsError && (
                  <p role="alert" className="text-sm text-destructive">
                    {t.map_metadata_tags_error()}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </AppDialogComponent>
  )
}
