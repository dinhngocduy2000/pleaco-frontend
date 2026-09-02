import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BOTS_ENDPOINTS } from '@/enum/endpoints'

const deleteRobotApi = vi.hoisted(() => vi.fn())

vi.mock('@/api/robots', () => ({ deleteRobotApi }))

import { useDeleteRobotMutation } from '@/queries/use-robots-query'

describe('useDeleteRobotMutation', () => {
  beforeEach(() => {
    deleteRobotApi.mockReset()
  })

  it('deletes the robot and invalidates all cached robot lists', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const id = '00000000-0000-4000-8000-000000000001'

    deleteRobotApi.mockResolvedValue({ data: undefined, message: 'Deleted', statusCode: 200 })

    const { result } = renderHook(() => useDeleteRobotMutation(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync(id)
    })

    expect(deleteRobotApi).toHaveBeenCalledWith(id, expect.anything())
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: [BOTS_ENDPOINTS.LIST] })
  })
})
