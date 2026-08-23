import { ChevronDownIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import type { IDropdownMenuProps } from '@/interface/utils'
import { cn } from '@/lib/utils'

const AppDropdownMenu = ({
  trigger,
  items,
  onSearch,
  dropdownContentClassName,
  contentAlign = 'end',
  triggerVariant = 'outline',
}: IDropdownMenuProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={triggerVariant}>
          {trigger ?? 'Actions'}
          {!trigger && <ChevronDownIcon strokeWidth={1} />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className={cn(
          'flex w-[--radix-dropdown-menu-trigger-width] min-w-56 flex-col gap-1 rounded-lg',
          dropdownContentClassName,
        )}
        side={'bottom'}
        align={contentAlign}
        sideOffset={4}
      >
        {onSearch && (
          <Input placeholder="Search an option.." onChange={(e) => onSearch(e.target.value)} />
        )}
        {items.map((item, index) => (
          <DropdownMenuItem
            onClick={item.onClick}
            key={index.toString()}
            disabled={item.disabled}
            className="hover:cursor-pointer"
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default AppDropdownMenu
