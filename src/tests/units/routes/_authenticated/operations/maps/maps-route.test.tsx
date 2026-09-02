import { describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    createFileRoute: () => (options: Record<string, unknown>) => options,
  }
})
vi.mock('@/routes/_authenticated/operations/components/maps/-map-list-component', () => ({
  MapsListComponent: () => null,
}))
vi.mock('@/routes/_authenticated/operations/components/maps/-maps-toolbar', () => ({
  MapsToolbar: () => null,
}))
vi.mock('@/lib/translation', () => ({ getTranslations: () => ({ sidebar_maps: () => 'Maps' }) }))

import { Route } from '@/routes/_authenticated/operations/maps'

const validateSearch = Route.validateSearch as (
  search: Record<string, unknown>,
) => Record<string, unknown>

describe('maps route search validation', () => {
  it('normalizes valid values and applies defaults for omitted search fields', () => {
    expect(
      validateSearch({
        page: '2',
        search: ' lobby ',
        status: 'ASSIGNED',
        tag_ids: ['tag-1'],
        order_direction: 'asc',
      }),
    ).toEqual({
      page: 2,
      search: 'lobby',
      status: 'ASSIGNED',
      tag_ids: ['tag-1'],
      order_direction: 'asc',
    })
  })

  it('rejects invalid pagination, filters, tags, and order direction', () => {
    expect(
      validateSearch({
        page: 0,
        search: '  ',
        status: 'UNKNOWN',
        tag_ids: ['tag-1', 3, ''],
        order_direction: 'SIDEWAYS',
      }),
    ).toEqual({
      page: 1,
      search: undefined,
      status: undefined,
      tag_ids: ['tag-1'],
      order_direction: 'desc',
    })
  })
})
