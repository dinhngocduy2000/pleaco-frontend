import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { IDockingStationInfo, IMapDetailInfo } from '@/interface/maps'
import { getTranslations } from '@/lib/translation'
import { useAssignDockingStationRobotMutation } from '@/queries/use-maps-query'
import { MapDetailRobotItem } from './-map-detail-robot-item'

const t = getTranslations()

type MapAssignRobotDialogProps = {
  map: IMapDetailInfo
  station: IDockingStationInfo
  open: boolean
  setOpen: (open: boolean) => void
}

export function MapAssignRobotDialog({ map, station, open, setOpen }: MapAssignRobotDialogProps) {
  const [selectedRobotId, setSelectedRobotId] = useState(station.robot_id)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const { mutateAsync, isPending } = useAssignDockingStationRobotMutation()
  const isAssigned = station.robot_id !== null

  const handleSave = async () => {
    if (!selectedRobotId || isAssigned) return
    setErrorMessage(null)
    try {
      await mutateAsync({ map_id: map.id, docking_id: station.id, robot_id: selectedRobotId })
      toast.success(t.map_detail_assign_success())
      setOpen(false)
    } catch {
      const message = t.map_detail_assign_error()
      setErrorMessage(message)
      toast.error(message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.map_detail_assign_robot()}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          {map.robots.length ? (
            <ul className="space-y-2">
              {map.robots.map((robot) => {
                const attachedElsewhere = map.docking_stations.some(
                  (otherStation) =>
                    otherStation.id !== station.id && otherStation.robot_id === robot.id,
                )
                return (
                  <MapDetailRobotItem
                    key={robot.id}
                    robot={robot}
                    selected={selectedRobotId === robot.id}
                    disabled={isAssigned || attachedElsewhere}
                    onSelect={() => setSelectedRobotId(robot.id)}
                  />
                )
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t.map_detail_assign_no_robots()}</p>
          )}
          {errorMessage && (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {errorMessage}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            {t.map_detail_assign_cancel()}
          </Button>
          <Button
            disabled={!selectedRobotId || isAssigned || isPending}
            type="button"
            onClick={handleSave}
          >
            {t.map_detail_assign_save()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
