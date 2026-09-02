import { describe, expect, it, vi } from 'vitest'
import { GROUPS_ENDPOINTS } from '@/enum/endpoints'
import { refreshGroupMembersList } from '@/lib/group-members'
import { cn, getErrorMessage, paramsSerializer } from '@/lib/utils'
import appReducer, { setTheme, toggleSidebar } from '@/stores/slices/appSlice'

vi.mock('@/lib/translation', () => ({
  getTranslations: () => ({ error_default: () => 'Fallback error' }),
}))

describe('shared utilities and app state', () => {
  it('merges class names and serializes only meaningful request parameters', () => {
    expect(cn('p-2', 'p-4', 'text-primary')).toBe('p-4 text-primary')
    expect(paramsSerializer({ page: 2, tag_ids: ['a', '', 'b'], empty: '', disabled: false })).toBe(
      'page=2&tag_ids=a&tag_ids=b',
    )
  })

  it('returns an API detail or a translated fallback error', () => {
    expect(getErrorMessage({ response: { data: { detail: 'Access denied' } } } as never)).toBe(
      'Access denied',
    )
    expect(getErrorMessage({ response: { data: {} } } as never)).toBe('Fallback error')
  })

  it('invalidates the current members page or resets back to the first page', () => {
    const invalidateQueries = vi.fn()
    const resetPage = vi.fn()
    refreshGroupMembersList({ page: 1, queryClient: { invalidateQueries } as never, resetPage })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: [GROUPS_ENDPOINTS.LIST_MEMBERS] })
    refreshGroupMembersList({ page: 2, queryClient: { invalidateQueries } as never, resetPage })
    expect(invalidateQueries).toHaveBeenLastCalledWith({
      queryKey: [GROUPS_ENDPOINTS.LIST_MEMBERS],
      refetchType: 'none',
    })
    expect(resetPage).toHaveBeenCalledOnce()
  })

  it('updates theme and sidebar state through reducers', () => {
    const dark = appReducer(undefined, setTheme('dark'))
    expect(dark).toMatchObject({ theme: 'dark', sidebarOpen: false })
    expect(appReducer(dark, toggleSidebar()).sidebarOpen).toBe(true)
  })
})
