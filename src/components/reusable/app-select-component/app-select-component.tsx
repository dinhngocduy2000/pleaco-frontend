'use client'

import { Command as CommandPrimitive } from 'cmdk'
import { CheckIcon, ChevronDownIcon, CircleIcon, SearchIcon, XIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Spinner } from '@/components/ui/spinner'
import type { IOption } from '@/interface/utils'
import { cn } from '@/lib/utils'
import InitialIcon from './initial-icon'
import { useAppSelect } from './use-app-select'

type ComboboxSelectBaseProps = {
  /** The list of selectable options. */
  options: IOption[]
  /** Text shown when no value is selected. @default "Select..." */
  placeholder?: string
  /** Message displayed inside the dropdown when no options match. @default "No options found." */
  emptyMessage?: string

  /** Whether the search input is visible. When `false`, the dropdown only shows the list. @default false */
  searchable?: boolean
  /** Placeholder text for the search input. Only relevant when `searchable` is `true`. @default "Search..." */
  searchPlaceholder?: string
  /** Callback fired with the debounced search string for server-side filtering. When provided, cmdk's built-in client-side filtering is disabled. */
  onSearchChange?: (search: string) => void
  /** Debounce delay in milliseconds applied to the search input before `onSearchChange` fires. @default 300 */
  debounceMs?: number

  /** Whether more options are available to load via infinite scroll. @default false */
  hasMore?: boolean
  /** Whether additional options are currently being fetched. Shows a spinner at the bottom of the list. @default false */
  isFetchingMore?: boolean
  /** Callback fired when the scroll sentinel becomes visible and `hasMore` is `true`. Use this to fetch the next page of options. */
  onLoadMore?: () => void

  /** Custom render function for each option. Receives the option and its selected state. When omitted, the default renderer displays `icon`, `label`, and `subLabel`. */
  render?: (option: IOption, isSelected: boolean) => React.ReactNode

  /** Additional CSS class names applied to the trigger button. */
  className?: string
  /** Whether the combobox is disabled. @default false */
  disabled?: boolean
}

type SingleProps = ComboboxSelectBaseProps & {
  /** When `false` or omitted, only a single option can be selected at a time. */
  multiple?: false
  /** The currently selected option, or `null` if nothing is selected. */
  value: IOption | undefined
  /** Callback fired when the selected option changes. Receives the new option or `null`. */
  onChange: (value: IOption | undefined) => void
}

type MultipleProps = ComboboxSelectBaseProps & {
  /** When `true`, multiple options can be selected. Selected options are shown as removable tags in the trigger. */
  multiple: true
  /** The list of currently selected options. */
  value: IOption[]
  /** Callback fired when the selected options change. Receives the updated array. */
  onChange: (value: IOption[]) => void
}

export type ComboboxSelectProps = SingleProps | MultipleProps

function SelectOptionIndicator({ multiple, selected }: { multiple: boolean; selected: boolean }) {
  if (multiple) {
    return (
      <span
        aria-hidden
        className={cn(
          'ml-auto flex size-4 shrink-0 items-center justify-center rounded-lg border border-muted-foreground/40',
          selected && 'border-primary bg-primary text-primary-foreground',
        )}
      >
        {selected && <CheckIcon className="size-3 stroke-white" />}
      </span>
    )
  }

  return (
    <span
      aria-hidden
      className={cn(
        'ml-auto flex size-3.5 shrink-0 items-center justify-center rounded-full border border-muted-foreground/40',
        selected && 'border-primary',
      )}
    >
      {selected && <CircleIcon className="size-2 fill-primary text-primary" />}
    </span>
  )
}

export function AppSelectComponent(props: ComboboxSelectProps) {
  const {
    options,
    placeholder = 'Select...',
    emptyMessage = 'No options found.',
    multiple = false,
    searchable = false,
    searchPlaceholder = 'Search...',
    onSearchChange,
    debounceMs = 300,
    hasMore = false,
    isFetchingMore = false,
    onLoadMore,
    render,
    className,
    disabled = false,
  } = props

  const {
    open,
    searchTerm,
    setSearchTerm,
    listRef,
    loaderRef,
    isSelected,
    handleSelect,
    handleRemoveTag,
    handleOpenChange,
  } = useAppSelect({
    props,
    multiple,
    onSearchChange,
    debounceMs,
    hasMore,
    isFetchingMore,
    onLoadMore,
  })

  const renderTriggerContent = () => {
    if (multiple && props.multiple) {
      if (props.value?.length === 0) {
        return <span className="text-muted-foreground">{placeholder}</span>
      }
      return (
        <div className="flex flex-wrap gap-1 h-fit">
          {props.value?.map((v) => (
            <span
              key={v.value}
              className="inline-flex items-center gap-1 rounded-sm bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground"
            >
              {v.icon && typeof v.icon === 'string' ? (
                <InitialIcon label={v.icon} />
              ) : (
                <span className="shrink-0">{v.icon}</span>
              )}
              {v.label}
              {/* biome-ignore lint/a11y/useSemanticElements: <button> inside <Button> causes hydration errors */}
              <span
                role="button"
                tabIndex={0}
                className="rounded-sm opacity-70 outline-none ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onPointerDown={(e) => e.preventDefault()}
                onClick={(e) => handleRemoveTag(v, e)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleRemoveTag(v, e as unknown as React.MouseEvent)
                  }
                }}
              >
                <XIcon className="size-3" />
              </span>
            </span>
          ))}
        </div>
      )
    }

    if (!props.multiple && props.value) {
      return (
        <div className="flex max-w-full min-w-0 items-center gap-2">
          {props.value?.icon && typeof props.value.icon === 'string' ? (
            <InitialIcon label={props.value.icon} />
          ) : (
            <span className="shrink-0">{props.value.icon}</span>
          )}
          <div className="flex min-w-0 flex-1 flex-col">
            <span
              className="block truncate text-sm"
              id={props.value?.value}
              data-testid="selected-label"
            >
              {props.value?.label}
            </span>
            {props.value?.subLabel && (
              <span className="text-[10px] text-muted-foreground">{props.value.subLabel}</span>
            )}
          </div>
        </div>
      )
    }

    return <span className="text-muted-foreground">{placeholder}</span>
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger data-testid="select-trigger" asChild disabled={disabled}>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full justify-between h-fit', className)}
        >
          <div className="min-w-0 flex-1 text-left">{renderTriggerContent()}</div>
          <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command
          shouldFilter={!onSearchChange}
          value={!multiple && !props.multiple ? (props.value?.label ?? '') : ''}
          onValueChange={() => {}}
        >
          {searchable && (
            <div className="flex h-9 items-center gap-2 border-b px-3">
              <SearchIcon className="size-4 shrink-0 opacity-50" />
              <CommandPrimitive.Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                data-testid="select-search-input"
                onValueChange={setSearchTerm}
                className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden placeholder:text-muted-foreground"
              />
            </div>
          )}
          <CommandList ref={listRef}>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup className="**:[[cmdk-group-items]]:space-y-1">
              {options.map((option) => {
                const selected = isSelected(option)
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    data-testid={`select-item-${option.value}`}
                    onSelect={() => handleSelect(option)}
                    className={cn(
                      'flex items-center gap-2',
                      selected && 'bg-accent text-accent-foreground',
                    )}
                  >
                    {render ? (
                      render(option, selected)
                    ) : (
                      <>
                        {option.icon && typeof option.icon === 'string' ? (
                          <InitialIcon label={option.icon} />
                        ) : (
                          <span className="shrink-0">{option.icon}</span>
                        )}
                        <div className="flex flex-1 flex-col">
                          <span data-testid={`select-item-label-${option.value}`}>
                            {option.label}
                          </span>
                          {option.subLabel && (
                            <span className="text-xs text-muted-foreground">{option.subLabel}</span>
                          )}
                        </div>
                      </>
                    )}
                    <SelectOptionIndicator multiple={multiple} selected={selected} />
                  </CommandItem>
                )
              })}
            </CommandGroup>
            <div ref={loaderRef} className="text-center">
              {isFetchingMore && <Spinner className="mx-auto size-4" />}
            </div>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
