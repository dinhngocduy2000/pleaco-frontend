import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TypographyMuted } from '@/components/ui/typography'
import {
  ROBOT_CONNECTION_STATUS,
  ROBOT_OPERATION_STATUS,
  type RobotConnectionStatusType,
  type RobotOperationStatusType,
} from '@/enum/robot'
import type { IMapDetailRobotInfo } from '@/interface/maps'
import { getTranslations } from '@/lib/translation'
import RobotImageByModel from '../../robots/-robot-img-model'

const t = getTranslations()

const getConnectionDotClassName = (status: RobotConnectionStatusType) => {
  const classByStatus: Record<RobotConnectionStatusType, string> = {
    [ROBOT_CONNECTION_STATUS.ONLINE]: 'bg-green-600',
    [ROBOT_CONNECTION_STATUS.STALE]: 'bg-yellow-500',
    [ROBOT_CONNECTION_STATUS.OFFLINE]: 'bg-destructive',
  }
  return classByStatus[status]
}

const getConnectionLabel = (status: RobotConnectionStatusType) => {
  const labelByStatus: Record<RobotConnectionStatusType, string> = {
    [ROBOT_CONNECTION_STATUS.ONLINE]: t.robot_card_connection_online(),
    [ROBOT_CONNECTION_STATUS.STALE]: t.robot_card_connection_delayed(),
    [ROBOT_CONNECTION_STATUS.OFFLINE]: t.robot_card_connection_offline(),
  }
  return labelByStatus[status]
}

const getOperationalStatusPresentation = (status: RobotOperationStatusType) => {
  const presentationByStatus: Record<
    RobotOperationStatusType,
    { className: string; label: string }
  > = {
    [ROBOT_OPERATION_STATUS.CHARGING]: {
      className:
        'border-yellow-700! bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
      label: t.robot_card_operation_charging(),
    },
    [ROBOT_OPERATION_STATUS.IDLE]: {
      className: 'border-primary/30! bg-primary/10 text-primary',
      label: t.robot_card_operation_idle(),
    },
    [ROBOT_OPERATION_STATUS.EXECUTING]: {
      className:
        'border-green-700! bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
      label: t.robot_card_operation_executing(),
    },
  }
  return presentationByStatus[status]
}

type MapDetailRobotItemProps = {
  robot: IMapDetailRobotInfo
  selection?: {
    selected: boolean
    disabled?: boolean
    disabledReason?: string
    onSelect: (robotId: string) => void
  }
}

export function MapDetailRobotItem({ robot, selection }: MapDetailRobotItemProps) {
  const connectionLabel = getConnectionLabel(robot.connection_status)
  const operationalStatus = getOperationalStatusPresentation(robot.operational_status)
  const content = (
    <>
      <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted">
        <RobotImageByModel model={robot.model} />
        <span
          aria-label={connectionLabel}
          className={`absolute right-1 bottom-1 size-3 rounded-full border-2 border-card ${getConnectionDotClassName(robot.connection_status)}`}
          role="status"
        />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate font-medium">{robot.name}</p>
        <TypographyMuted className="truncate text-xs">{robot.serial_num}</TypographyMuted>
      </div>
      <Badge className={`shrink-0 ${operationalStatus.className}`} variant="outline">
        {operationalStatus.label}
      </Badge>
    </>
  )

  return (
    <li className="min-w-0">
      {selection ? (
        <Button
          aria-pressed={selection.selected}
          className={`h-auto w-full min-w-0 justify-start gap-3 rounded-lg border px-3 py-3 text-left shadow-none transition-colors ${
            selection.selected
              ? 'border-green-600! bg-green-50/60 dark:bg-green-950/30'
              : 'hover:bg-accent/50'
          } disabled:cursor-not-allowed disabled:opacity-60`}
          disabled={selection.disabled}
          type="button"
          variant="outline"
          onClick={() => selection.onSelect(robot.id)}
        >
          {content}
        </Button>
      ) : (
        <div className="flex min-w-0 items-center gap-3 rounded-lg border p-3">{content}</div>
      )}
      {selection?.disabled && selection.disabledReason && (
        <TypographyMuted className="mt-1 px-3 text-xs">{selection.disabledReason}</TypographyMuted>
      )}
    </li>
  )
}
