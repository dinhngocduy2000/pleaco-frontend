import type { LucideIcon } from 'lucide-react'
import {
  BatteryCharging,
  CirclePause,
  CirclePlay,
  MoreVertical,
  Wifi,
  WifiOff,
  WifiZero,
} from 'lucide-react'
import AppDropdownMenu from '@/components/reusable/app-dropdown-menu/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Item, ItemContent, ItemFooter, ItemMedia } from '@/components/ui/item'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { TypographyH2, TypographyMuted, TypographySmall } from '@/components/ui/typography'
import {
  ROBOT_CONNECTION_STATUS,
  ROBOT_OPERATION_STATUS,
  type RobotConnectionStatusType,
  RobotModel,
  type RobotModelType,
  type RobotOperationStatusType,
} from '@/enum/robot'
import type { IRobotInfo } from '@/interface/robots'
import { getTranslations } from '@/lib/translation'
import RobotImageByModel from './-robot-img-model'

type BotCardItemComponentProps = {
  robot: IRobotInfo
}

type IStatusPresentation = {
  label: string
  icon: LucideIcon
  className: string
}

const BATTERY_PERCENTAGE = 64
const STATIC_TAGS = ['Lobby', 'Floor 1', 'Day Shift']
const t = getTranslations()

const getOperationStatusPresentation = (status: RobotOperationStatusType): IStatusPresentation => {
  const statusByOperation: Record<RobotOperationStatusType, IStatusPresentation> = {
    [ROBOT_OPERATION_STATUS.CHARGING]: {
      label: t.robot_card_operation_charging(),
      icon: BatteryCharging,
      className:
        'border-yellow-700! bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
    },
    [ROBOT_OPERATION_STATUS.IDLE]: {
      label: t.robot_card_operation_idle(),
      icon: CirclePause,
      className: 'border-primary/30! bg-primary/10 text-primary',
    },
    [ROBOT_OPERATION_STATUS.EXECUTING]: {
      label: t.robot_card_operation_executing(),
      icon: CirclePlay,
      className:
        'border-green-700! bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
    },
  }

  return statusByOperation[status]
}

const getConnectionStatusPresentation = (
  status: RobotConnectionStatusType,
): IStatusPresentation => {
  const statusByConnection: Record<RobotConnectionStatusType, IStatusPresentation> = {
    [ROBOT_CONNECTION_STATUS.ONLINE]: {
      label: t.robot_card_connection_online(),
      icon: Wifi,
      className: 'text-green-700 dark:text-green-300',
    },
    [ROBOT_CONNECTION_STATUS.STALE]: {
      label: t.robot_card_connection_delayed(),
      icon: WifiZero,
      className: 'text-yellow-700 dark:text-yellow-300',
    },
    [ROBOT_CONNECTION_STATUS.OFFLINE]: {
      label: t.robot_card_connection_offline(),
      icon: WifiOff,
      className: 'text-destructive',
    },
  }

  return statusByConnection[status]
}

const getModelBadgeClassName = (model: RobotModelType): string => {
  const classNameByModel: Record<RobotModelType, string> = {
    [RobotModel.LITE]:
      'border-violet-700! bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
    [RobotModel.PRO]:
      'border-purple-900! bg-gradient-to-r from-purple-800 to-violet-700 text-white dark:from-purple-700 dark:to-violet-600',
    [RobotModel.STANDARD]:
      'border-purple-700! bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  }

  return classNameByModel[model]
}

const getBatteryIndicatorClassName = (percentage: number): string => {
  if (percentage >= 70) return '[&_[data-slot=progress-indicator]]:bg-green-600 stroke-green-600'
  if (percentage >= 30) return '[&_[data-slot=progress-indicator]]:bg-yellow-500 stroke-yellow-500'
  return '[&_[data-slot=progress-indicator]]:bg-destructive'
}

export function BotCardItemComponent({ robot }: BotCardItemComponentProps) {
  const operationStatus = getOperationStatusPresentation(robot.operational_status)
  const connectionStatus = getConnectionStatusPresentation(robot.connection_status)
  const modelBadgeClassName = getModelBadgeClassName(robot.model)
  const OperationStatusIcon = operationStatus.icon
  const ConnectionStatusIcon = connectionStatus.icon

  return (
    <Item className="block overflow-hidden rounded-xl border-border bg-card p-0 shadow-sm">
      <div className="grid min-w-0 md:grid-cols-[14rem_minmax(0,1fr)]">
        <ItemMedia className="min-h-52 w-full rounded-none bg-muted p-4 md:min-h-full md:w-auto">
          <RobotImageByModel model={robot.model} />
        </ItemMedia>
        <div className="flex min-w-0 flex-col">
          <ItemContent className="gap-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <TypographyH2 className="truncate border-0 p-0 text-lg">
                    {robot.name}
                  </TypographyH2>
                  <Badge
                    variant="outline"
                    className={`rounded-md px-2.5 py-1 ${modelBadgeClassName}`}
                  >
                    {robot.model}
                  </Badge>
                </div>
                <TypographyMuted className="mt-1">{robot.serial_num}</TypographyMuted>
              </div>
              <Badge variant="outline" className={operationStatus.className}>
                <OperationStatusIcon aria-hidden="true" />
                {operationStatus.label}
              </Badge>
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] sm:gap-4">
              <dl>
                <div>
                  <dt>
                    <TypographySmall className="text-muted-foreground">
                      {t.robot_card_map_label()}
                    </TypographySmall>
                  </dt>
                  <dd className="mt-1 font-medium">
                    <TypographySmall>
                      {robot.map_name ?? t.robot_card_map_unassigned()}
                    </TypographySmall>
                  </dd>
                </div>
              </dl>
              <Separator orientation="vertical" className="hidden self-stretch sm:block" />
              <dl>
                <div>
                  <dt>
                    <TypographySmall className="text-muted-foreground">
                      {t.robot_card_ip_label()}
                    </TypographySmall>
                  </dt>
                  <dd className="mt-1 font-medium">
                    <TypographySmall>{robot.ip_address}</TypographySmall>
                  </dd>
                </div>
              </dl>
            </div>

            <div className="flex flex-wrap gap-2">
              {STATIC_TAGS.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </ItemContent>

          <ItemFooter className="mt-auto border-t px-5 py-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-3">
              <div className="flex min-w-36 items-center gap-2">
                <BatteryCharging
                  aria-hidden="true"
                  className={`size-6 ${getBatteryIndicatorClassName(BATTERY_PERCENTAGE)}`}
                />
                <TypographySmall className="font-semibold">{BATTERY_PERCENTAGE}%</TypographySmall>
                <Progress
                  aria-label={t.robot_card_battery_percentage({ percentage: BATTERY_PERCENTAGE })}
                  value={BATTERY_PERCENTAGE}
                  className={`h-1.5 min-w-16 flex-1 bg-muted ${getBatteryIndicatorClassName(BATTERY_PERCENTAGE)}`}
                />
              </div>
              <TypographySmall className={`flex items-center gap-2 ${connectionStatus.className}`}>
                <ConnectionStatusIcon aria-hidden="true" className="size-4" />
                {connectionStatus.label}
              </TypographySmall>
            </div>
            <AppDropdownMenu
              trigger={
                <>
                  <MoreVertical aria-hidden="true" />
                  <TypographySmall className="sr-only">{t.robot_card_menu_label()}</TypographySmall>
                </>
              }
              triggerVariant="ghost"
              items={[
                {
                  label: t.robot_card_menu_delete(),
                  value: 'delete',
                  onClick: () => undefined,
                },
                {
                  label: t.robot_card_menu_deactivate(),
                  value: 'deactivate',
                  onClick: () => undefined,
                },
                {
                  label: t.robot_card_menu_assign_map(),
                  value: 'assign-map',
                  onClick: () => undefined,
                },
              ]}
            />
          </ItemFooter>
        </div>
      </div>
    </Item>
  )
}
