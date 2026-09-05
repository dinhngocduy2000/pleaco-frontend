import type { AxiosError } from 'axios'
import type { ReactNode } from 'react'

export type ReactQueryHookParams<T> = {
  queryKey?: unknown[]
  params: T
  enabled?: boolean
}

export type IMutation<ResponseType = unknown, VariableType = unknown> = {
  onSuccess?: (data?: ResponseType, variables?: VariableType) => void
  onError?: (_error: unknown) => void
  onMutate?: VoidFunction
  signal?: AbortSignal
}

export type IOption = {
  label: string
  value: string
  subLabel?: string
  icon?: React.ReactNode | string
  disabled?: boolean
}

export type IDropdownMenuProps = {
  trigger?: string | ReactNode
  triggerAriaLabel?: string
  items: IDropdownMenuItem[]
  onSearch?: (value: string) => void
  dropdownContentClassName?: string
  contentAlign?: 'start' | 'end'
  triggerVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  disabled?: boolean
}
export type IDropdownMenuItem = {
  label: string | ReactNode
  value: string
  onClick: VoidFunction
  disabled?: boolean
}

export type IAxiosError = AxiosError<{
  detail: string
}>
