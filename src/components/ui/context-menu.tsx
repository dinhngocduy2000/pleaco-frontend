import { ContextMenu as Primitive } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export const ContextMenu = Primitive.Root
export const ContextMenuTrigger = Primitive.Trigger
export function ContextMenuContent({
  className,
  ...props
}: ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        {...props}
        className={cn(
          'z-50 min-w-40 rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
          className,
        )}
      />
    </Primitive.Portal>
  )
}
export function ContextMenuItem({ className, ...props }: ComponentProps<typeof Primitive.Item>) {
  return (
    <Primitive.Item
      {...props}
      className={cn(
        'relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
    />
  )
}
