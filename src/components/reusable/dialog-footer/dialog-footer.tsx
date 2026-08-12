import { Button, type ButtonProps } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'

type Props = {
  cancelButtonProps?: ButtonProps
  confirmButtonProps?: ButtonProps
  cancelButtonText?: string
  confirmButtonText?: string
  onConfirm?: VoidFunction
  onCancel: VoidFunction
}

const DialogFooterComponent = ({
  cancelButtonProps,
  cancelButtonText = 'Cancel',
  confirmButtonProps,
  confirmButtonText = 'Save',
  onCancel,
  onConfirm = () => {},
}: Props) => {
  return (
    <DialogFooter className="sticky bottom-0 mt-auto flex w-full justify-end gap-2 bg-white">
      <Button {...cancelButtonProps} type="button" onClick={onCancel} variant={'secondary'}>
        {cancelButtonText}
      </Button>
      <Button onClick={onConfirm} {...confirmButtonProps}>
        {confirmButtonText}
      </Button>
    </DialogFooter>
  )
}

export default DialogFooterComponent
