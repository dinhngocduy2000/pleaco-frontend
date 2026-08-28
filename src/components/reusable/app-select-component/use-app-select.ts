import { useCallback, useEffect, useRef, useState } from 'react'

import { useDebounce } from '@/hooks/use-debounce'
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll'
import type { IOption } from '@/interface/utils'

import type { ComboboxSelectProps } from './app-select-component'

type UseAppSelectParams = Pick<
  ComboboxSelectProps,
  'onSearchChange' | 'debounceMs' | 'hasMore' | 'isFetchingMore' | 'onLoadMore'
> & {
  props: ComboboxSelectProps
  multiple: boolean
}

export function useAppSelect({
  props,
  multiple,
  onSearchChange,
  debounceMs = 300,
  hasMore = false,
  isFetchingMore = false,
  onLoadMore,
}: UseAppSelectParams) {
  const [open, setOpen] = useState<boolean>(false)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const debouncedSearch = useDebounce(searchTerm, debounceMs)
  const listRef = useRef<HTMLDivElement>(null)
  const prevDebouncedRef = useRef(debouncedSearch)

  useEffect(() => {
    if (prevDebouncedRef.current === debouncedSearch) return

    prevDebouncedRef.current = debouncedSearch
    onSearchChange?.(debouncedSearch)
  }, [debouncedSearch, onSearchChange])
  const handleLoadMore = useCallback(() => {
    onLoadMore?.()
  }, [onLoadMore])

  const { loaderRef } = useInfiniteScroll({
    onPageChange: handleLoadMore,
    hasMore,
    isFetchingData: isFetchingMore,
    root: listRef.current,
  })

  const isSelected = (option: IOption): boolean => {
    if (multiple && props.multiple) {
      return props.value.some((v) => v.value === option.value)
    }
    if (!multiple && !props.multiple) {
      return props.value?.value === option.value
    }
    return false
  }

  const handleSelect = (option: IOption) => {
    if (multiple && props.multiple) {
      const alreadySelected = props.value.some((v) => v.value === option.value)
      if (alreadySelected) {
        props.onChange(props.value.filter((v) => v.value !== option.value))
      } else {
        props.onChange([...props.value, option])
      }
    } else if (!multiple && !props.multiple) {
      props.onChange(option)
      setOpen(false)
    }
  }

  const handleRemoveTag = (option: IOption, e: React.MouseEvent) => {
    e.stopPropagation()
    if (multiple && props.multiple) {
      props.onChange(props.value.filter((v) => v.value !== option.value))
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      setSearchTerm('')
    }
  }

  return {
    open,
    searchTerm,
    setSearchTerm,
    listRef,
    loaderRef,
    isSelected,
    handleSelect,
    handleRemoveTag,
    handleOpenChange,
  }
}
