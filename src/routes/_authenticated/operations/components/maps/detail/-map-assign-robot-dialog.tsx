import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import AppDialogComponent from '@/components/reusable/app-dialog/app-dialog-component'
import { Button } from '@/components/ui/button'
import { DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TypographyMuted } from '@/components/ui/typography'
import type { IMapDetailInfo } from '@/interface/maps'
import type { IAxiosError } from '@/interface/utils'
import { getTranslations } from '@/lib/translation'
import { getErrorMessage } from '@/lib/utils'
import { useAssignDockingStationRobotMutation } from '@/queries/use-maps-query'
import { MapDetailRobotItem } from './-map-detail-robot-item'

const t = getTranslations()

type MapAssignRobotDialogProps = {
  open: boolean
  setOpen: (open: boolean) => void
  map: IMapDetailInfo
  groupId: string
  dockingId?: string
}

export function MapAssignRobotDialog({
  open,
  setOpen,
  map,
  groupId,
  dockingId,
}: MapAssignRobotDialogProps) {
  const [selectedRobotId, setSelectedRobotId] = useState<string>()
  const { mutate: assignRobot, isPending } = useAssignDockingStationRobotMutation({
    onSuccess: () => {
      toast.success(t.map_detail_station_assign_success())
      setOpen(false)
    },
    onError: (error) => {
      const axiosError = error as IAxiosError
      toast.error(
        axiosError.response?.status === 409
          ? t.map_detail_station_assign_conflict()
          : getErrorMessage(axiosError) || t.map_detail_station_assign_error(),
      )
    },
  })
  const station = map.docking_stations.find((item) => item.id === dockingId)
  const otherStationRobotIds = useMemo(
    () =>
      new Set(
        map.docking_stations
          .filter((item) => item.id !== dockingId && item.robot_id)
          .map((item) => item.robot_id as string),
      ),
    [dockingId, map.docking_stations],
  )

  useEffect(() => {
    if (open) setSelectedRobotId(undefined)
  }, [open])

  useEffect(() => {
    if (selectedRobotId && otherStationRobotIds.has(selectedRobotId)) {
      setSelectedRobotId(undefined)
    }
  }, [otherStationRobotIds, selectedRobotId])

  const selectedRobotIsValid = Boolean(
    selectedRobotId &&
      map.robots.some((robot) => robot.id === selectedRobotId) &&
      !otherStationRobotIds.has(selectedRobotId),
  )

  const handleSave = () => {
    if (!station || !selectedRobotId || !selectedRobotIsValid || isPending) return
    assignRobot({
      map_id: map.id,
      docking_id: station.id,
      group_id: groupId,
      robot_id: selectedRobotId,
    })
  }

  return (
    <AppDialogComponent
      disableClickOverlay={isPending}
      dialogProps={{ className: 'max-h-[calc(100vh-2rem)] overflow-hidden pt-6 sm:max-w-xl' }}
      dialogTrigger={null}
      footer={false}
      header={false}
      open={open}
      setOpen={(nextOpen) => {
        if (!isPending) setOpen(typeof nextOpen === 'function' ? nextOpen(open) : nextOpen)
      }}
      title={t.map_detail_station_assign_title()}
    >
      <DialogHeader className="shrink-0 pr-8 text-left">
        <DialogTitle>{t.map_detail_station_assign_title()}</DialogTitle>
        <TypographyMuted>{t.map_detail_station_assign_description()}</TypographyMuted>
      </DialogHeader>
      {(!station || station.robot_id !== null) && (
        <TypographyMuted role="alert" className="text-destructive">
          {t.map_detail_station_assign_unavailable()}
        </TypographyMuted>
      )}
      <div className="min-h-0 flex-1 overflow-auto">
        {map.robots.length > 0 ? (
          <ul aria-label={t.map_detail_station_assign_robot_list()} className="space-y-2">
            {map.robots.map((robot) => {
              const disabled = otherStationRobotIds.has(robot.id)
              return (
                <MapDetailRobotItem
                  key={robot.id}
                  robot={robot}
                  selection={{
                    selected: selectedRobotId === robot.id,
                    disabled,
                    disabledReason: disabled
                      ? t.map_detail_station_robot_assigned_elsewhere()
                      : undefined,
                    onSelect: setSelectedRobotId,
                  }}
                />
              )
            })}
          </ul>
        ) : (
          <TypographyMuted className="py-8 text-center">
            {t.map_detail_station_assign_empty()}
          </TypographyMuted>
        )}
      </div>
      <div className="flex shrink-0 justify-end gap-2">
        <Button disabled={isPending} type="button" variant="outline" onClick={() => setOpen(false)}>
          {t.map_create_cancel()}
        </Button>
        <Button
          disabled={!selectedRobotIsValid || isPending || !station || station.robot_id !== null}
          type="button"
          onClick={handleSave}
        >
          {isPending ? t.map_detail_station_assign_saving() : t.map_boundary_save()}
        </Button>
      </div>
    </AppDialogComponent>
  )
}
