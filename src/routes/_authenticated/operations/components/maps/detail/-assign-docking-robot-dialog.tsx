import { zodResolver } from '@hookform/resolvers/zod'
import { useId, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import AppDialogComponent from '@/components/reusable/app-dialog/app-dialog-component'
import type { IAssignDockingRobotForm, IMapDetailInfo } from '@/interface/maps'
import type { IAxiosError } from '@/interface/utils'
import { getTranslations } from '@/lib/translation'
import { getErrorMessage } from '@/lib/utils'
import { useAssignDockingRobotMutation } from '@/queries/use-maps-query'
import { assignDockingRobotSchema } from '@/schemas/map-schemas'
import { MapDetailRobotItem } from './-map-detail-robot-item'

const t = getTranslations()
export function AssignDockingRobotDialog({
  map,
  dockingId,
  groupId,
  onClose,
}: {
  map: IMapDetailInfo
  dockingId: string
  groupId: string
  onClose: () => void
}) {
  const formId = useId()
  const submitting = useRef(false)
  const form = useForm<IAssignDockingRobotForm>({
    resolver: zodResolver(assignDockingRobotSchema()),
    mode: 'onChange',
    defaultValues: { robot_id: '' },
  })
  const selectedId = form.watch('robot_id')
  const { mutateAsync, isPending } = useAssignDockingRobotMutation(groupId)
  const occupiedIds = new Set(
    map.docking_stations.filter((station) => station.robot_id).map((station) => station.robot_id),
  )
  const station = map.docking_stations.find((station) => station.id === dockingId)
  const eligible = Boolean(
    station &&
      !station.robot_id &&
      map.robots.some((robot) => robot.id === selectedId && !occupiedIds.has(robot.id)),
  )
  const saving = isPending || form.formState.isSubmitting
  const submit = async ({ robot_id }: IAssignDockingRobotForm) => {
    if (!eligible || submitting.current) return
    submitting.current = true
    try {
      await mutateAsync({ map_id: map.id, docking_id: dockingId, robot_id })
      toast.success(t.map_docking_save_success())
      onClose()
    } catch (error) {
      toast.error(getErrorMessage(error as IAxiosError) || t.map_docking_save_error())
    } finally {
      submitting.current = false
    }
  }
  return (
    <AppDialogComponent
      open
      setOpen={(next) => {
        if (!submitting.current && !saving && next === false) onClose()
      }}
      dialogTrigger={null}
      title={t.map_docking_assign()}
      disableClickOverlay={saving}
      cancelButtonText={t.map_metadata_cancel()}
      cancelButtonProps={{ disabled: saving }}
      confirmButtonText={t.map_metadata_save()}
      confirmButtonProps={{
        type: 'submit',
        form: formId,
        disabled: !eligible || !form.formState.isValid || saving,
        loading: saving,
      }}
      dialogProps={{ 'aria-describedby': undefined }}
    >
      <form id={formId} onSubmit={form.handleSubmit(submit)} className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {station?.robot_id ? t.map_docking_occupied() : t.map_docking_select_robot()}
        </p>
        {map.robots.length ? (
          <ul
            className="max-h-96 space-y-3 overflow-y-auto"
            aria-label={t.map_docking_select_robot()}
          >
            {map.robots.map((robot) => (
              <MapDetailRobotItem
                key={robot.id}
                robot={robot}
                selected={selectedId === robot.id}
                disabled={
                  saving || occupiedIds.has(robot.id) || !station || Boolean(station.robot_id)
                }
                disabledReason={
                  occupiedIds.has(robot.id) ? t.map_docking_robot_unavailable() : undefined
                }
                onSelect={() =>
                  form.setValue('robot_id', robot.id, { shouldValidate: true, shouldDirty: true })
                }
              />
            ))}
          </ul>
        ) : (
          <p>{t.map_detail_assigned_robots_empty()}</p>
        )}
      </form>
    </AppDialogComponent>
  )
}
