import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TAGS_ENDPOINTS } from '@/enum/endpoints'

const getTagsApi = vi.hoisted(() => vi.fn())
const useProfileQuery = vi.hoisted(() => vi.fn())
vi.mock('@/api/tags', () => ({ getTagsApi }))
vi.mock('@/queries/use-auth-query', () => ({ useProfileQuery }))

import { useTagsQuery } from '@/queries/use-tags-query'

describe('useTagsQuery', () => {
  beforeEach(() => {
    getTagsApi.mockReset()
    useProfileQuery.mockReset()
  })

  it('does not request tags until the current profile has an active group', () => {
    useProfileQuery.mockReturnValue({ data: undefined })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(useTagsQuery, { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
    expect(getTagsApi).not.toHaveBeenCalled()
  })

  it('uses the active group and tags endpoint query key', async () => {
    useProfileQuery.mockReturnValue({ data: { data: { group_id: 'group-1' } } })
    getTagsApi.mockResolvedValue({ data: [{ id: 'tag-1', name: 'Priority' }] })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(useTagsQuery, { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getTagsApi).toHaveBeenCalledWith({ group_id: 'group-1' }, expect.any(AbortSignal))
    expect(client.getQueryData([TAGS_ENDPOINTS.LIST])).toEqual({
      data: [{ id: 'tag-1', name: 'Priority' }],
    })
  })
})
