import { X } from 'lucide-react'
import type { Dialog as DialogPrimitive } from 'radix-ui'
import {
  Activity,
  type ComponentProps,
  type PropsWithChildren,
  type ReactNode,
  type RefObject,
  useState,
} from 'react'
import { Button, type ButtonProps } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type DialogContentProps = ComponentProps<typeof DialogPrimitive.Content>

import AlertDialogComponent from '@/components/reusable/alert-dialog/app-alert-dialog'

interface Props extends PropsWithChildren {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  dialogTrigger: ReactNode
  onConfirm?: VoidFunction
  title?: string
  text?: string
  footer?: boolean
  header?: boolean
  cancelButtonProps?: ButtonProps
  cancelButtonText?: string
  confirmButtonProps?: ButtonProps
  confirmButtonText?: string
  dialogProps?: DialogContentProps
  isFormDirty?: boolean
  disableClickOverlay?: boolean
  isFormDirtyRef?: RefObject<boolean>
  onCancel?: VoidFunction
}

const AppDialogComponent = ({
  dialogTrigger,
  onConfirm = () => undefined,
  title = '',
  cancelButtonText = 'Cancel',
  cancelButtonProps,
  confirmButtonProps,
  confirmButtonText = 'Save',
  footer = true,
  open = false,
  setOpen,
  children,
  dialogProps,
  disableClickOverlay,
  isFormDirtyRef,
  header = true,
  onCancel,
}: Props) => {
  const [openConfirmClose, setOpenConfirmClose] = useState<boolean>(false)
  const onClose = () => {
    onCancel?.()
    setOpen(false)
  }

  const onOpenChange = (open: boolean) => {
    if (disableClickOverlay) {
      return
    }
    if (!isFormDirtyRef || !('current' in isFormDirtyRef) || !isFormDirtyRef.current)
      return setOpen(open)

    if (!open && isFormDirtyRef.current) return setOpenConfirmClose(true)
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/** biome-ignore lint/a11y/noStaticElementInteractions: temporary*/}
      {/** biome-ignore lint/a11y/useKeyWithClickEvents: temporary*/}
      <div className={cn(!dialogTrigger && 'hidden', 'w-fit')} onClick={() => setOpen(true)}>
        {dialogTrigger && dialogTrigger}
      </div>
      <DialogContent
        {...dialogProps}
        showCloseButton={false}
        className={cn('flex flex-col overflow-auto pt-0', dialogProps?.className)}
      >
        <Activity mode={header ? 'visible' : 'hidden'}>
          <DialogHeader className="sticky top-0 z-10 flex h-fit flex-row items-center justify-between gap-4 bg-white pt-5 pb-4">
            <DialogTitle>{title}</DialogTitle>
            <DialogClose
              onClick={() => {
                setOpen(false)
              }}
              className={cn(
                'rounded-sm pb-1 opacity-70 ring-offset-background',
                'transition-opacity hover:opacity-100 focus:outline-none focus:ring-2',
                'focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none',
                'data-[state=open]:bg-accent data-[state=open]:text-muted-foreground',
              )}
            >
              <X className="h-6 w-6" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>
        </Activity>
        {children}
        <Activity mode={footer ? 'visible' : 'hidden'}>
          <DialogFooter>
            <Button
              className="min-w-[100px]"
              variant={'secondary'}
              onClick={onClose}
              {...cancelButtonProps}
            >
              {cancelButtonText}
            </Button>
            <Button className="min-w-[100px]" onClick={onConfirm} {...confirmButtonProps}>
              {confirmButtonText}
            </Button>
          </DialogFooter>
        </Activity>
        <AlertDialogComponent
          open={openConfirmClose}
          setOpen={setOpenConfirmClose}
          dialogTrigger={null}
          text="You have unsaved data."
          onConfirm={() => {
            setOpenConfirmClose(false)
            setOpen(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
export default AppDialogComponent
