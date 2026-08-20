import { type PropsWithChildren, type ReactNode, useRef } from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

interface Props extends PropsWithChildren {
  dialogTrigger: ReactNode
  onConfirm: VoidFunction
  title?: string
  text?: string
  open?: boolean
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>
  loading?: boolean
  context?: 'edit' | 'delete'
  confirmText?: string
}

const AlertDialogComponent = ({
  dialogTrigger,
  onConfirm = () => {},
  title = 'Are you absolutely sure?',
  text = 'Are you sure you want to continue with this action? ',
  open,
  setOpen,
  loading,
  children,
  context = 'delete',
  confirmText = 'Confirm',
}: Props) => {
  const alertCancelRef = useRef<HTMLButtonElement | null>(null)
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{dialogTrigger}</AlertDialogTrigger>
      <AlertDialogContent onOverlayClick={() => alertCancelRef.current?.click()}>
        <AlertDialogHeader>
          <AlertDialogTitle className="line-clamp-2">{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {text} {context === 'delete' && 'This action cannot be undone.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel ref={alertCancelRef}>Cancel</AlertDialogCancel>
          <Button
            className="max-h-full"
            disabled={loading}
            loading={loading}
            type="button"
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default AlertDialogComponent
