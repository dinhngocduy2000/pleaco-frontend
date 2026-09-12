import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
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

type MapDetailRobotsCardProps = {
  robots: IMapDetailRobotInfo[]
}

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

function MapDetailRobotItem({ robot }: { robot: IMapDetailRobotInfo }) {
  const connectionLabel = getConnectionLabel(robot.connection_status)
  const operationalStatus = getOperationalStatusPresentation(robot.operational_status)

  return (
    <li className="flex min-w-0 items-center gap-3 rounded-lg border p-3">
      <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted">
        <RobotImageByModel model={robot.model} />
        <span
          aria-label={connectionLabel}
          className={`absolute right-1 bottom-1 size-3 rounded-full border-2 border-card ${getConnectionDotClassName(robot.connection_status)}`}
          role="status"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{robot.name}</p>
        <TypographyMuted className="truncate text-xs">{robot.serial_num}</TypographyMuted>
      </div>
      <Badge className={`shrink-0 ${operationalStatus.className}`} variant="outline">
        {operationalStatus.label}
      </Badge>
    </li>
  )
}

export function MapDetailRobotsCard({ robots }: MapDetailRobotsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.map_detail_assigned_robots({ count: robots.length })}</CardTitle>
      </CardHeader>
      <CardContent>
        {robots.length > 0 ? (
          <ul className="space-y-3">
            {robots.map((robot) => (
              <MapDetailRobotItem key={robot.id} robot={robot} />
            ))}
          </ul>
        ) : (
          <TypographyMuted>{t.map_detail_assigned_robots_empty()}</TypographyMuted>
        )}
      </CardContent>
      <CardFooter>
        <Button type="button" variant="outline" onClick={() => undefined}>
          {t.map_detail_manage_robot_assignment()}
        </Button>
      </CardFooter>
    </Card>
  )
}
