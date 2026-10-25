import { type ReactNode, useRef, useState } from 'react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { getTranslations } from '@/lib/translation'
import {
  DOCKING_STATION_TOOL,
  type IMapLayoutShape,
} from '../map-preview-editor/model/-layout-types'

const t = getTranslations()
type Props = {
  children: (onZoneContextMenu: (zone: IMapLayoutShape) => void) => ReactNode
  onEdit: (id: string) => void
  onAssign: (id: string) => void
}
export function MapZoneContextMenu({ children, onEdit, onAssign }: Props) {
  const pendingAction = useRef<(() => void) | null>(null)
  const pendingTarget = useRef<IMapLayoutShape | null>(null)
  const [target, setTarget] = useState<IMapLayoutShape | null>(null)
  const actions =
    target?.zoneType === DOCKING_STATION_TOOL
      ? [
          {
            id: 'edit',
            label: t.map_docking_edit(),
            disabled: false,
            onSelect: () => onEdit(target.clientId),
          },
          {
            id: 'assign',
            label: t.map_docking_assign(),
            disabled: Boolean(target.robot_id),
            onSelect: () => onAssign(target.clientId),
          },
        ]
      : []
  return (
    <ContextMenu
      onOpenChange={(open) => {
        if (!open) pendingTarget.current = null
      }}
    >
      <ContextMenuTrigger
        asChild
        onContextMenu={(event) => {
          if (!pendingTarget.current) event.preventDefault()
          else setTarget(pendingTarget.current)
        }}
      >
        <div
          className="flex min-h-0 min-w-0 flex-1"
          onContextMenuCapture={() => {
            pendingTarget.current = null
          }}
        >
          {children((zone) => {
            pendingTarget.current = zone
          })}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          const action = pendingAction.current
          pendingAction.current = null
          action?.()
        }}
      >
        {actions.map((action) => (
          <ContextMenuItem
            key={action.id}
            disabled={action.disabled}
            onSelect={() => {
              pendingAction.current = action.onSelect
            }}
          >
            {action.label}
          </ContextMenuItem>
        ))}
        {target?.zoneType === DOCKING_STATION_TOOL && target.robot_id && (
          <p className="max-w-56 px-2 py-1 text-xs text-muted-foreground">
            {t.map_docking_occupied()}
          </p>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
