import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'
import DialogFooterComponent from '@/components/reusable/dialog-footer/dialog-footer'

vi.mock('@/components/ui/button', () => ({
  Button: ({
    asChild: _asChild,
    loading: _loading,
    children,
    ...props
  }: PropsWithChildren<
    { asChild?: boolean; loading?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>
  >) => <button {...props}>{children}</button>,
}))

function renderFooter(overrides: Partial<Parameters<typeof DialogFooterComponent>[0]> = {}) {
  const props = {
    onCancel: vi.fn(),
    ...overrides,
  }
  return {
    ...render(<DialogFooterComponent {...props} />),
    onCancel: props.onCancel,
  }
}

describe('DialogFooterComponent', () => {
  describe('rendering', () => {
    it('renders Cancel and Save buttons with default text', () => {
      renderFooter()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    })

    it('renders custom cancel button text', () => {
      renderFooter({ cancelButtonText: 'Discard' })
      expect(screen.getByRole('button', { name: 'Discard' })).toBeInTheDocument()
    })

    it('renders custom confirm button text', () => {
      renderFooter({ confirmButtonText: 'Submit' })
      expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()
    })
  })

  describe('callbacks', () => {
    it('calls onCancel when the cancel button is clicked', async () => {
      const { onCancel } = renderFooter()
      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(onCancel).toHaveBeenCalledOnce()
    })

    it('calls onConfirm when the confirm button is clicked', async () => {
      const onConfirm = vi.fn()
      renderFooter({ onConfirm })
      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Save' }))
      expect(onConfirm).toHaveBeenCalledOnce()
    })

    it('does not call onConfirm when cancel is clicked', async () => {
      const onConfirm = vi.fn()
      renderFooter({ onConfirm })
      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(onConfirm).not.toHaveBeenCalled()
    })

    it('does not call onCancel when confirm is clicked', async () => {
      const { onCancel } = renderFooter({ onConfirm: vi.fn() })
      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Save' }))
      expect(onCancel).not.toHaveBeenCalled()
    })
  })

  describe('button props forwarding', () => {
    it('forwards cancelButtonProps to the cancel button', () => {
      renderFooter({ cancelButtonProps: { disabled: true } })
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    })

    it('forwards confirmButtonProps to the confirm button', () => {
      renderFooter({ confirmButtonProps: { disabled: true } })
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    })

    it('sets type="button" on the cancel button regardless of cancelButtonProps', () => {
      renderFooter({ cancelButtonProps: { type: 'submit' } })
      expect(screen.getByRole('button', { name: 'Cancel' })).toHaveAttribute('type', 'button')
    })
  })
})
