import { type ReactNode, useRef, useState } from 'react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import type { IMapLayoutShape, MapCanvasZoneType } from '../map-preview-editor/model/-layout-types'

export type MapZoneMenuAction = {
  id: string
  label: string
  disabled?: boolean
  onSelect: () => void
}

type MapZoneContextMenuProps = {
  actionsByZoneType: Partial<
    Record<MapCanvasZoneType, (shape: IMapLayoutShape) => MapZoneMenuAction[]>
  >
  children: (props: {
    onZoneContextMenu: (shape: IMapLayoutShape, nativeEvent: MouseEvent) => void
  }) => ReactNode
}

export function MapZoneContextMenu({ actionsByZoneType, children }: MapZoneContextMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [targetShape, setTargetShape] = useState<IMapLayoutShape>()
  const actions = targetShape ? (actionsByZoneType[targetShape.zoneType]?.(targetShape) ?? []) : []

  const onZoneContextMenu = (shape: IMapLayoutShape, nativeEvent: MouseEvent) => {
    const configuredActions = actionsByZoneType[shape.zoneType]?.(shape)
    if (!configuredActions?.length || !triggerRef.current) return
    setTargetShape(shape)
    triggerRef.current.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: nativeEvent.clientX,
        clientY: nativeEvent.clientY,
        button: 2,
      }),
    )
  }

  return (
    <ContextMenu
      onOpenChange={(open) => {
        if (!open) setTargetShape(undefined)
      }}
    >
      <ContextMenuTrigger asChild>
        <button
          aria-hidden="true"
          className="pointer-events-none absolute -left-[10000px] -top-[10000px] size-px opacity-0"
          ref={triggerRef}
          tabIndex={-1}
          type="button"
        />
      </ContextMenuTrigger>
      {children({ onZoneContextMenu })}
      <ContextMenuContent>
        {actions.map((action) => (
          <ContextMenuItem
            key={action.id}
            disabled={action.disabled}
            onSelect={() => {
              action.onSelect()
              setTargetShape(undefined)
            }}
          >
            {action.label}
          </ContextMenuItem>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  )
}
