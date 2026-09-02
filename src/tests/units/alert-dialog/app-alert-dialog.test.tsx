import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'
import AlertDialogComponent from '@/components/reusable/alert-dialog/app-alert-dialog'

vi.mock('@/components/ui/button', () => ({
  Button: ({
    asChild,
    loading: _loading,
    children,
    ...props
  }: PropsWithChildren<
    { asChild?: boolean; loading?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>
  >) => {
    if (asChild) return <>{children}</>
    return <button {...props}>{children}</button>
  },
}))

function renderDialog(props: Partial<Parameters<typeof AlertDialogComponent>[0]> = {}) {
  const defaultProps = {
    // biome-ignore lint/a11y/useButtonType: only for testing
    dialogTrigger: <button>Open Dialog</button>,
    onConfirm: vi.fn(),
    ...props,
  }
  return {
    ...render(<AlertDialogComponent {...defaultProps} />),
    onConfirm: defaultProps.onConfirm,
  }
}

async function openDialog() {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Open Dialog' }))
}

describe('AlertDialogComponent', () => {
  describe('rendering – closed state', () => {
    it('renders the trigger element', () => {
      renderDialog()
      expect(screen.getByRole('button', { name: 'Open Dialog' })).toBeInTheDocument()
    })

    it('does not render dialog content before opening', () => {
      renderDialog()
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })
  })

  describe('rendering – open state', () => {
    it('shows the dialog when the trigger is clicked', async () => {
      renderDialog()
      await openDialog()
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    })

    it('renders the default title and description', async () => {
      renderDialog()
      await openDialog()
      expect(screen.getByText('Are you absolutely sure?')).toBeInTheDocument()
      expect(
        screen.getByText(/Are you sure you want to continue with this action/),
      ).toBeInTheDocument()
    })

    it('renders custom title and text', async () => {
      renderDialog({ title: 'Delete item?', text: 'This will remove the item.' })
      await openDialog()
      expect(screen.getByText('Delete item?')).toBeInTheDocument()
      expect(screen.getByText(/This will remove the item\./)).toBeInTheDocument()
    })

    it('renders Cancel and Confirm buttons', async () => {
      renderDialog()
      await openDialog()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
    })

    it('renders custom confirmText', async () => {
      renderDialog({ confirmText: 'Yes, delete' })
      await openDialog()
      expect(screen.getByRole('button', { name: 'Yes, delete' })).toBeInTheDocument()
    })

    it('renders children inside the dialog', async () => {
      render(
        <AlertDialogComponent
          dialogTrigger={<button type="button">Open Dialog</button>}
          onConfirm={vi.fn()}
        >
          <p>Extra content</p>
        </AlertDialogComponent>,
      )
      await openDialog()
      expect(screen.getByText('Extra content')).toBeInTheDocument()
    })
  })

  describe('context-dependent description', () => {
    it('appends "This action cannot be undone." when context is delete (default)', async () => {
      renderDialog()
      await openDialog()
      expect(screen.getByText(/This action cannot be undone\./)).toBeInTheDocument()
    })

    it('does not append the undo warning when context is edit', async () => {
      renderDialog({ context: 'edit' })
      await openDialog()
      expect(screen.queryByText(/This action cannot be undone\./)).not.toBeInTheDocument()
    })
  })

  describe('onConfirm callback', () => {
    it('calls onConfirm when the confirm button is clicked', async () => {
      const { onConfirm } = renderDialog()
      const user = userEvent.setup()
      await openDialog()
      await user.click(screen.getByRole('button', { name: 'Confirm' }))
      expect(onConfirm).toHaveBeenCalledOnce()
    })

    it('does not call onConfirm when Cancel is clicked', async () => {
      const { onConfirm } = renderDialog()
      const user = userEvent.setup()
      await openDialog()
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(onConfirm).not.toHaveBeenCalled()
    })
  })

  describe('loading state', () => {
    it('disables the confirm button when loading is true', () => {
      renderDialog({ loading: true, open: true })
      expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled()
    })

    it('enables the confirm button when loading is false', () => {
      renderDialog({ loading: false, open: true })
      expect(screen.getByRole('button', { name: 'Confirm' })).toBeEnabled()
    })
  })

  describe('controlled open/setOpen', () => {
    it('renders dialog content when open is true without clicking the trigger', () => {
      renderDialog({ open: true })
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    })

    it('does not render dialog content when open is false', () => {
      renderDialog({ open: false })
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })

    it('calls setOpen when the dialog open state changes', async () => {
      const setOpen = vi.fn()
      renderDialog({ open: true, setOpen })
      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(setOpen).toHaveBeenCalledWith(false)
    })
  })

  describe('cancel / close behavior', () => {
    it('closes the dialog when Cancel is clicked (uncontrolled)', async () => {
      renderDialog()
      const user = userEvent.setup()
      await openDialog()
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })
  })

  describe('custom trigger element', () => {
    it('renders a custom trigger node', () => {
      renderDialog({ dialogTrigger: <span>Custom Trigger</span> })
      expect(screen.getByText('Custom Trigger')).toBeInTheDocument()
    })
  })
})
