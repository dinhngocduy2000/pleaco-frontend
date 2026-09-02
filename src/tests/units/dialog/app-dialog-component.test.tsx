/** biome-ignore-all lint/a11y/useButtonType: testing only */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'
import AppDialogComponent from '@/components/reusable/app-dialog/app-dialog-component'

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

function renderDialog(overrides: Partial<Parameters<typeof AppDialogComponent>[0]> = {}) {
  const props = {
    open: false as boolean,
    setOpen: vi.fn(),
    dialogTrigger: <button>Open</button>,
    ...overrides,
  }
  return {
    ...render(<AppDialogComponent {...props} />),
    setOpen: props.setOpen,
  }
}

describe('AppDialogComponent', () => {
  describe('trigger', () => {
    it('renders the trigger element', () => {
      renderDialog()
      expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument()
    })

    it('calls setOpen(true) when the trigger is clicked', async () => {
      const { setOpen } = renderDialog()
      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Open' }))
      expect(setOpen).toHaveBeenCalledWith(true)
    })

    it('hides the trigger wrapper when dialogTrigger is null', () => {
      renderDialog({ dialogTrigger: null })
      expect(screen.queryByRole('button', { name: 'Open' })).not.toBeInTheDocument()
    })
  })

  describe('rendering – open state', () => {
    it('renders the dialog when open is true', () => {
      renderDialog({ open: true })
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('does not render the dialog when open is false', () => {
      renderDialog({ open: false })
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders the title in the header', () => {
      renderDialog({ open: true, title: 'Edit Profile' })
      expect(screen.getByText('Edit Profile')).toBeInTheDocument()
    })

    it('renders children inside the dialog', () => {
      render(
        <AppDialogComponent open={true} setOpen={vi.fn()} dialogTrigger={<button>Open</button>}>
          <p>Form content here</p>
        </AppDialogComponent>,
      )
      expect(screen.getByText('Form content here')).toBeInTheDocument()
    })

    it('renders Cancel and Save buttons by default', () => {
      renderDialog({ open: true })
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    })

    it('renders the Close (X) button in the header', () => {
      renderDialog({ open: true })
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
    })
  })

  describe('button customization', () => {
    it('renders custom cancel button text', () => {
      renderDialog({ open: true, cancelButtonText: 'Discard' })
      expect(screen.getByRole('button', { name: 'Discard' })).toBeInTheDocument()
    })

    it('renders custom confirm button text', () => {
      renderDialog({ open: true, confirmButtonText: 'Submit' })
      expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()
    })

    it('forwards cancelButtonProps to the cancel button', () => {
      renderDialog({ open: true, cancelButtonProps: { disabled: true } })
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    })

    it('forwards confirmButtonProps to the confirm button', () => {
      renderDialog({ open: true, confirmButtonProps: { disabled: true } })
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    })
  })

  describe('close behaviors', () => {
    it('calls setOpen(false) when the Close (X) button is clicked', async () => {
      const { setOpen } = renderDialog({ open: true })
      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Close' }))
      expect(setOpen).toHaveBeenCalledWith(false)
    })

    it('calls setOpen(false) when Cancel is clicked', async () => {
      const { setOpen } = renderDialog({ open: true })
      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(setOpen).toHaveBeenCalledWith(false)
    })

    it('does not call onConfirm when Cancel is clicked', async () => {
      const onConfirm = vi.fn()
      renderDialog({ open: true, onConfirm })
      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(onConfirm).not.toHaveBeenCalled()
    })
  })

  describe('onConfirm', () => {
    it('calls onConfirm when Save is clicked', async () => {
      const onConfirm = vi.fn()
      renderDialog({ open: true, onConfirm })
      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Save' }))
      expect(onConfirm).toHaveBeenCalledOnce()
    })
  })

  describe('disableClickOverlay', () => {
    it('does not close the dialog via Escape when disableClickOverlay is true', async () => {
      const { setOpen } = renderDialog({ open: true, disableClickOverlay: true })
      const user = userEvent.setup()
      await user.keyboard('{Escape}')
      expect(setOpen).not.toHaveBeenCalledWith(false)
    })

    it('closes the dialog via Escape when disableClickOverlay is false', async () => {
      const { setOpen } = renderDialog({ open: true, disableClickOverlay: false })
      const user = userEvent.setup()
      await user.keyboard('{Escape}')
      expect(setOpen).toHaveBeenCalledWith(false)
    })
  })

  describe('dirty form confirmation', () => {
    it('shows the unsaved data dialog when a dirty form tries to close', async () => {
      const dirtyRef = { current: true }
      renderDialog({ open: true, isFormDirtyRef: dirtyRef })
      const user = userEvent.setup()
      await user.keyboard('{Escape}')
      expect(screen.getByText(/You have unsaved data\./)).toBeInTheDocument()
    })

    it('does not show the unsaved data dialog when the form is clean', async () => {
      const dirtyRef = { current: false }
      const { setOpen } = renderDialog({ open: true, isFormDirtyRef: dirtyRef })
      const user = userEvent.setup()
      await user.keyboard('{Escape}')
      expect(screen.queryByText(/You have unsaved data\./)).not.toBeInTheDocument()
      expect(setOpen).toHaveBeenCalledWith(false)
    })

    it('closes both dialogs when the user confirms discarding unsaved data', async () => {
      const dirtyRef = { current: true }
      const { setOpen } = renderDialog({ open: true, isFormDirtyRef: dirtyRef })
      const user = userEvent.setup()
      await user.keyboard('{Escape}')
      expect(screen.getByText(/You have unsaved data\./)).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Confirm' }))
      expect(setOpen).toHaveBeenCalledWith(false)
    })
  })
})
