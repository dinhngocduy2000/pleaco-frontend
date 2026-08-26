import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TAGS_ENDPOINTS } from '@/enum/endpoints'

const get = vi.hoisted(() => vi.fn())

vi.mock('@/api', () => ({ default: { get } }))

import { getTagsApi } from '@/api/tags'

describe('getTagsApi', () => {
  beforeEach(() => {
    get.mockReset()
  })

  it('gets the complete tag list without query parameters', async () => {
    const signal = new AbortController().signal
    get.mockResolvedValue({
      data: [{ id: '00000000-0000-4000-8000-000000000001', name: 'Priority', color: '#ef4444' }],
      message: 'OK',
      statusCode: 200,
    })

    await getTagsApi(signal)

    expect(get).toHaveBeenCalledWith(TAGS_ENDPOINTS.LIST, { signal })
  })
})
