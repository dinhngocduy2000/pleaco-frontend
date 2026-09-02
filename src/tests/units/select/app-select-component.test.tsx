/** biome-ignore-all lint/a11y/useButtonType: testing only */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { AppSelectComponent } from '@/components/reusable/app-select-component/app-select-component'
import type { IOption } from '@/interface/utils'

beforeAll(() => {
  globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })) as unknown as typeof ResizeObserver

  globalThis.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })) as unknown as typeof IntersectionObserver

  Element.prototype.scrollIntoView = vi.fn()
})

const ITEMS: IOption[] = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry' },
]

const hasClass = (el: HTMLElement, cls: string) => el.className.split(/\s+/).includes(cls)

describe('AppSelectComponent', () => {
  describe('single mode (default)', () => {
    it('renders the trigger with the default placeholder', () => {
      render(<AppSelectComponent options={ITEMS} value={undefined} onChange={vi.fn()} />)
      expect(screen.getByRole('combobox')).toHaveTextContent('Select...')
    })

    it('renders a custom placeholder', () => {
      render(
        <AppSelectComponent
          options={ITEMS}
          value={undefined}
          onChange={vi.fn()}
          placeholder="Pick one"
        />,
      )
      expect(screen.getByRole('combobox')).toHaveTextContent('Pick one')
    })

    it('shows the selected item label when value is set', () => {
      render(
        <AppSelectComponent
          options={ITEMS}
          value={{ label: 'Banana', value: 'banana' }}
          onChange={vi.fn()}
        />,
      )
      expect(screen.getByRole('combobox')).toHaveTextContent('Banana')
    })

    it('opens the dropdown and renders all items on trigger click', async () => {
      render(<AppSelectComponent options={ITEMS} value={undefined} onChange={vi.fn()} />)
      const user = userEvent.setup()
      await user.click(screen.getByRole('combobox'))
      for (const item of ITEMS) {
        expect(screen.getByText(item.label)).toBeInTheDocument()
      }
    })

    it('calls onChange with the selected IOption', async () => {
      const onChange = vi.fn()
      render(<AppSelectComponent options={ITEMS} value={undefined} onChange={onChange} />)
      const user = userEvent.setup()
      await user.click(screen.getByRole('combobox'))
      await user.click(screen.getByRole('option', { name: 'Banana' }))
      expect(onChange).toHaveBeenCalledWith({ label: 'Banana', value: 'banana' })
    })

    it('closes the dropdown after selecting an item', async () => {
      render(<AppSelectComponent options={ITEMS} value={undefined} onChange={vi.fn()} />)
      const user = userEvent.setup()
      await user.click(screen.getByRole('combobox'))
      expect(screen.getByText('Apple')).toBeInTheDocument()
      await user.click(screen.getByRole('option', { name: 'Banana' }))
      expect(screen.queryByRole('option', { name: 'Apple' })).not.toBeInTheDocument()
    })
  })

  describe('multiple mode', () => {
    it('shows the placeholder when no items are selected', () => {
      render(
        <AppSelectComponent
          multiple
          options={ITEMS}
          value={[]}
          onChange={vi.fn()}
          placeholder="Select fruits"
        />,
      )
      expect(screen.getByRole('combobox')).toHaveTextContent('Select fruits')
    })

    it('shows selected items as tags', () => {
      render(
        <AppSelectComponent
          multiple
          options={ITEMS}
          value={[{ label: 'Apple', value: 'apple' }]}
          onChange={vi.fn()}
        />,
      )
      expect(screen.getByText('Apple')).toBeInTheDocument()
    })

    it('calls onChange adding the selected item', async () => {
      const onChange = vi.fn()
      render(<AppSelectComponent multiple options={ITEMS} value={[]} onChange={onChange} />)
      const user = userEvent.setup()
      await user.click(screen.getByRole('combobox'))
      await user.click(screen.getByRole('option', { name: /Apple/ }))
      expect(onChange).toHaveBeenCalledWith([{ label: 'Apple', value: 'apple' }])
    })

    it('calls onChange removing an already-selected item', async () => {
      const onChange = vi.fn()
      render(
        <AppSelectComponent
          multiple
          options={ITEMS}
          value={[
            { label: 'Apple', value: 'apple' },
            { label: 'Banana', value: 'banana' },
          ]}
          onChange={onChange}
        />,
      )
      const user = userEvent.setup()
      await user.click(screen.getByRole('combobox'))
      await user.click(screen.getByRole('option', { name: /Apple/ }))
      expect(onChange).toHaveBeenCalledWith([{ label: 'Banana', value: 'banana' }])
    })

    it('keeps the dropdown open after selecting an item', async () => {
      render(<AppSelectComponent multiple options={ITEMS} value={[]} onChange={vi.fn()} />)
      const user = userEvent.setup()
      await user.click(screen.getByRole('combobox'))
      await user.click(screen.getByRole('option', { name: /Apple/ }))
      expect(screen.getByRole('option', { name: /Banana/ })).toBeInTheDocument()
    })

    it('removes a tag when clicking the X button', async () => {
      const onChange = vi.fn()
      render(
        <AppSelectComponent
          multiple
          options={ITEMS}
          value={[
            { label: 'Apple', value: 'apple' },
            { label: 'Banana', value: 'banana' },
          ]}
          onChange={onChange}
        />,
      )
      const user = userEvent.setup()
      const removeButtons = screen.getAllByRole('button', { hidden: true })
      const appleRemoveBtn = removeButtons.find((btn) =>
        btn.parentElement?.textContent?.includes('Apple'),
      )
      expect(appleRemoveBtn).toBeDefined()
      if (!appleRemoveBtn) return
      await user.click(appleRemoveBtn)
      expect(onChange).toHaveBeenCalledWith([{ label: 'Banana', value: 'banana' }])
    })
  })

  describe('disabled state', () => {
    it('disables the trigger when disabled is true', () => {
      render(<AppSelectComponent options={ITEMS} value={undefined} onChange={vi.fn()} disabled />)
      expect(screen.getByRole('combobox')).toBeDisabled()
    })

    it('does not open the dropdown when the trigger is disabled', async () => {
      render(<AppSelectComponent options={ITEMS} value={undefined} onChange={vi.fn()} disabled />)
      const user = userEvent.setup()
      await user.click(screen.getByRole('combobox'))
      expect(screen.queryByRole('option')).not.toBeInTheDocument()
    })
  })

  describe('render prop', () => {
    it('uses the custom render function for each item', async () => {
      render(
        <AppSelectComponent
          options={ITEMS}
          value={undefined}
          onChange={vi.fn()}
          render={(item) => <span data-testid="custom-item">{item.label} (custom)</span>}
        />,
      )
      const user = userEvent.setup()
      await user.click(screen.getByRole('combobox'))
      expect(screen.getByText('Apple (custom)')).toBeInTheDocument()
      expect(screen.getByText('Banana (custom)')).toBeInTheDocument()
      expect(screen.getByText('Cherry (custom)')).toBeInTheDocument()
    })

    it('passes isSelected to the render function in multiple mode', async () => {
      const renderFn = vi.fn((item: IOption, isSelected: boolean) => (
        <span>
          {item.label} {isSelected ? '✓' : ''}
        </span>
      ))
      render(
        <AppSelectComponent
          multiple
          options={ITEMS}
          value={[{ label: 'Apple', value: 'apple' }]}
          onChange={vi.fn()}
          render={renderFn}
        />,
      )
      const user = userEvent.setup()
      await user.click(screen.getByRole('combobox'))
      expect(renderFn).toHaveBeenCalledWith(expect.objectContaining({ value: 'apple' }), true)
      expect(renderFn).toHaveBeenCalledWith(expect.objectContaining({ value: 'banana' }), false)
    })
  })

  describe('selected item highlighting', () => {
    it('highlights the selected option in single mode', async () => {
      render(
        <AppSelectComponent
          options={ITEMS}
          value={{ label: 'Banana', value: 'banana' }}
          onChange={vi.fn()}
        />,
      )
      const user = userEvent.setup()
      await user.click(screen.getByRole('combobox'))
      const bananaOption = screen.getByRole('option', { name: 'Banana' })
      expect(hasClass(bananaOption, 'bg-accent')).toBe(true)
    })

    it('does not highlight unselected options in single mode', async () => {
      render(
        <AppSelectComponent
          options={ITEMS}
          value={{ label: 'Banana', value: 'banana' }}
          onChange={vi.fn()}
        />,
      )
      const user = userEvent.setup()
      await user.click(screen.getByRole('combobox'))
      const appleOption = screen.getByRole('option', { name: 'Apple' })
      expect(hasClass(appleOption, 'bg-accent')).toBe(false)
    })

    it('does not highlight the first option by default when nothing is selected', async () => {
      render(<AppSelectComponent options={ITEMS} value={undefined} onChange={vi.fn()} />)
      const user = userEvent.setup()
      await user.click(screen.getByRole('combobox'))
      const appleOption = screen.getByRole('option', { name: 'Apple' })
      expect(hasClass(appleOption, 'bg-accent')).toBe(false)
    })

    it('highlights all selected options in multiple mode', async () => {
      render(
        <AppSelectComponent
          multiple
          options={ITEMS}
          value={[
            { label: 'Apple', value: 'apple' },
            { label: 'Cherry', value: 'cherry' },
          ]}
          onChange={vi.fn()}
        />,
      )
      const user = userEvent.setup()
      await user.click(screen.getByRole('combobox'))
      const appleOption = screen.getByRole('option', { name: /Apple/ })
      const bananaOption = screen.getByRole('option', { name: /Banana/ })
      const cherryOption = screen.getByRole('option', { name: /Cherry/ })
      expect(hasClass(appleOption, 'bg-accent')).toBe(true)
      expect(hasClass(bananaOption, 'bg-accent')).toBe(false)
      expect(hasClass(cherryOption, 'bg-accent')).toBe(true)
    })
  })

  describe('empty state', () => {
    it('shows the default empty message when options list is empty', async () => {
      render(<AppSelectComponent options={[]} value={undefined} onChange={vi.fn()} />)
      const user = userEvent.setup()
      await user.click(screen.getByRole('combobox'))
      expect(screen.getByText('No options found.')).toBeInTheDocument()
    })

    it('shows a custom empty message', async () => {
      render(
        <AppSelectComponent
          options={[]}
          value={undefined}
          onChange={vi.fn()}
          emptyMessage="Nothing here"
        />,
      )
      const user = userEvent.setup()
      await user.click(screen.getByRole('combobox'))
      expect(screen.getByText('Nothing here')).toBeInTheDocument()
    })
  })
})
