import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import AppDropdownMenu from '@/components/reusable/app-dropdown-menu/dropdown-menu'
import type { IDropdownMenuItem } from '@/interface/utils'

beforeAll(() => {
  globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })) as unknown as typeof ResizeObserver

  globalThis.DOMRect = {
    fromRect: () => ({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      toJSON: vi.fn(),
    }),
  } as unknown as typeof DOMRect

  Element.prototype.scrollIntoView = vi.fn()

  window.HTMLElement.prototype.hasPointerCapture = vi.fn()
  window.HTMLElement.prototype.setPointerCapture = vi.fn()
  window.HTMLElement.prototype.releasePointerCapture = vi.fn()
})

const ITEMS: IDropdownMenuItem[] = [
  { label: 'Edit', value: 'edit', onClick: vi.fn() },
  { label: 'Delete', value: 'delete', onClick: vi.fn() },
  { label: 'Share', value: 'share', onClick: vi.fn() },
]

function makeItems(overrides: Partial<IDropdownMenuItem>[] = []): IDropdownMenuItem[] {
  return ITEMS.map((item, i) => ({ ...item, onClick: vi.fn(), ...overrides[i] }))
}

async function openDropdown() {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button'))
  return user
}

describe('AppDropdownMenu', () => {
  describe('rendering – closed state', () => {
    it('renders without crashing with minimal props', () => {
      const items = makeItems()
      expect(() => render(<AppDropdownMenu items={items} />)).not.toThrow()
    })

    it('renders the default "Actions" trigger when no trigger prop is provided', () => {
      const items = makeItems()
      render(<AppDropdownMenu items={items} />)
      expect(screen.getByRole('button', { name: /Actions/i })).toBeInTheDocument()
    })

    it('renders the ChevronDownIcon when using default trigger', () => {
      const items = makeItems()
      render(<AppDropdownMenu items={items} />)
      const button = screen.getByRole('button')
      expect(button.querySelector('svg')).toBeInTheDocument()
    })

    it('renders a custom string trigger', () => {
      const items = makeItems()
      render(<AppDropdownMenu items={items} trigger="Options" />)
      expect(screen.getByRole('button', { name: /Options/i })).toBeInTheDocument()
    })

    it('uses the supplied accessible trigger name', () => {
      const items = makeItems()
      render(<AppDropdownMenu items={items} triggerAriaLabel="Actions for Milo" />)
      expect(screen.getByRole('button', { name: 'Actions for Milo' })).toBeInTheDocument()
    })

    it('renders a custom ReactNode trigger', () => {
      const items = makeItems()
      render(<AppDropdownMenu items={items} trigger={<span>Custom Trigger</span>} />)
      expect(screen.getByText('Custom Trigger')).toBeInTheDocument()
    })

    it('does not show the ChevronDownIcon when a custom trigger is provided', () => {
      const items = makeItems()
      render(<AppDropdownMenu items={items} trigger="My Menu" />)
      const button = screen.getByRole('button')
      expect(button.querySelector('svg')).not.toBeInTheDocument()
    })

    it('does not render menu items before the dropdown is opened', () => {
      const items = makeItems()
      render(<AppDropdownMenu items={items} />)
      expect(screen.queryByRole('menuitem')).not.toBeInTheDocument()
    })
  })

  describe('rendering – open state', () => {
    it('shows all menu items when the dropdown is opened', async () => {
      const items = makeItems()
      render(<AppDropdownMenu items={items} />)
      await openDropdown()
      expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: 'Share' })).toBeInTheDocument()
    })

    it('renders the correct number of menu items', async () => {
      const items = makeItems()
      render(<AppDropdownMenu items={items} />)
      await openDropdown()
      expect(screen.getAllByRole('menuitem')).toHaveLength(3)
    })

    it('renders items with ReactNode labels', async () => {
      const items: IDropdownMenuItem[] = [
        { label: <span data-testid="icon-label">With Icon</span>, value: 'icon', onClick: vi.fn() },
      ]
      render(<AppDropdownMenu items={items} />)
      await openDropdown()
      expect(screen.getByTestId('icon-label')).toBeInTheDocument()
    })
  })

  describe('search functionality', () => {
    it('does not render the search input when onSearch is not provided', async () => {
      const items = makeItems()
      render(<AppDropdownMenu items={items} />)
      await openDropdown()
      expect(screen.queryByPlaceholderText('Search an option..')).not.toBeInTheDocument()
    })

    it('renders the search input when onSearch is provided', async () => {
      const items = makeItems()
      const onSearch = vi.fn()
      render(<AppDropdownMenu items={items} onSearch={onSearch} />)
      await openDropdown()
      expect(screen.getByPlaceholderText('Search an option..')).toBeInTheDocument()
    })

    it('calls onSearch when the user types into the search input', async () => {
      const items = makeItems()
      const onSearch = vi.fn()
      render(<AppDropdownMenu items={items} onSearch={onSearch} />)
      const user = await openDropdown()
      const searchInput = screen.getByPlaceholderText('Search an option..')
      await user.type(searchInput, 'E')
      expect(onSearch).toHaveBeenCalledWith('E')
    })

    it('calls onSearch with an empty string when input is cleared', async () => {
      const items = makeItems()
      const onSearch = vi.fn()
      render(<AppDropdownMenu items={items} onSearch={onSearch} />)
      const user = await openDropdown()
      const searchInput = screen.getByPlaceholderText('Search an option..')
      await user.type(searchInput, 'a')
      onSearch.mockClear()
      await user.clear(searchInput)
      expect(onSearch).toHaveBeenCalledWith('')
    })
  })

  describe('item click behavior', () => {
    it('calls the onClick handler of the clicked item', async () => {
      const items = makeItems()
      render(<AppDropdownMenu items={items} />)
      const user = await openDropdown()
      await user.click(screen.getByRole('menuitem', { name: 'Edit' }))
      expect(items[0].onClick).toHaveBeenCalledOnce()
    })

    it('calls only the onClick handler of the specific clicked item', async () => {
      const items = makeItems()
      render(<AppDropdownMenu items={items} />)
      const user = await openDropdown()
      await user.click(screen.getByRole('menuitem', { name: 'Delete' }))
      expect(items[0].onClick).not.toHaveBeenCalled()
      expect(items[1].onClick).toHaveBeenCalledOnce()
      expect(items[2].onClick).not.toHaveBeenCalled()
    })
  })

  describe('disabled items', () => {
    it('renders a disabled menu item', async () => {
      const items = makeItems([{}, { disabled: true }, {}])
      render(<AppDropdownMenu items={items} />)
      await openDropdown()
      const deleteItem = screen.getByRole('menuitem', { name: 'Delete' })
      expect(deleteItem).toHaveAttribute('data-disabled', '')
    })

    it('marks the disabled item with aria-disabled', async () => {
      const items = makeItems([{}, { disabled: true }, {}])
      render(<AppDropdownMenu items={items} />)
      await openDropdown()
      const deleteItem = screen.getByRole('menuitem', { name: 'Delete' })
      expect(deleteItem).toHaveAttribute('aria-disabled', 'true')
    })

    it('non-disabled items remain clickable alongside disabled ones', async () => {
      const items = makeItems([{}, { disabled: true }, {}])
      render(<AppDropdownMenu items={items} />)
      const user = await openDropdown()
      await user.click(screen.getByRole('menuitem', { name: 'Edit' }))
      expect(items[0].onClick).toHaveBeenCalledOnce()
    })
  })

  describe('contentAlign prop', () => {
    it('defaults contentAlign to "end"', async () => {
      const items = makeItems()
      render(<AppDropdownMenu items={items} />)
      await openDropdown()
      const content = document.querySelector('[data-slot="dropdown-menu-content"]')
      expect(content).toBeInTheDocument()
    })

    it('accepts contentAlign="start" without crashing', () => {
      const items = makeItems()
      expect(() => render(<AppDropdownMenu items={items} contentAlign="start" />)).not.toThrow()
    })
  })

  describe('dropdownContentClassName prop', () => {
    it('applies additional className to the dropdown content', async () => {
      const items = makeItems()
      render(<AppDropdownMenu items={items} dropdownContentClassName="my-custom-class" />)
      await openDropdown()
      const content = document.querySelector('[data-slot="dropdown-menu-content"]')
      expect(content).toHaveClass('my-custom-class')
    })
  })

  describe('empty items', () => {
    it('renders without crashing when items array is empty', () => {
      expect(() => render(<AppDropdownMenu items={[]} />)).not.toThrow()
    })

    it('shows no menu items when items array is empty', async () => {
      render(<AppDropdownMenu items={[]} />)
      await openDropdown()
      expect(screen.queryByRole('menuitem')).not.toBeInTheDocument()
    })
  })

  describe('single item', () => {
    it('renders correctly with a single item', async () => {
      const items: IDropdownMenuItem[] = [{ label: 'Solo', value: 'solo', onClick: vi.fn() }]
      render(<AppDropdownMenu items={items} />)
      await openDropdown()
      expect(screen.getAllByRole('menuitem')).toHaveLength(1)
      expect(screen.getByRole('menuitem', { name: 'Solo' })).toBeInTheDocument()
    })
  })
})
