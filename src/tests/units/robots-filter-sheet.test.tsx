import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

const navigate = vi.hoisted(() => vi.fn())
const tags = vi.hoisted(() => ({ data: { data: [{ id: 'tag-1', name: 'Lobby' }] } }))

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))
vi.mock('@/routes/_authenticated/operations/robots', () => ({
  Route: { fullPath: '/operations/robots' },
}))
vi.mock('@/queries/use-tags-query', () => ({ useTagsQuery: () => tags }))
vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  SheetContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  SheetDescription: ({ children }: React.PropsWithChildren) => <p>{children}</p>,
  SheetFooter: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  SheetHeader: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  SheetTitle: ({ children }: React.PropsWithChildren) => <h2>{children}</h2>,
}))
vi.mock('@/components/reusable/app-select-component/app-select-component', () => ({
  AppSelectComponent: ({
    multiple,
    onChange,
    placeholder,
  }: {
    multiple?: boolean
    onChange: (value: { value: string } | { value: string }[]) => void
    placeholder: string
  }) => (
    <button
      onClick={() =>
        onChange(
          multiple ? [{ value: 'tag-1' }] : { value: placeholder === 'Model' ? 'PRO' : 'IDLE' },
        )
      }
      type="button"
    >
      {placeholder}
    </button>
  ),
}))
vi.mock('@/lib/translation', () => ({
  getTranslations: () => ({
    robots_filters_title: () => 'Filters',
    robots_filters_description: () => 'Refine robots',
    robots_filter_model: () => 'Model',
    robots_filter_operational_status: () => 'Operational status',
    robots_filter_connection_status: () => 'Connection status',
    robots_filter_tags: () => 'Tags',
    robots_filter_tags_empty: () => 'No tags',
    robots_filters_reset: () => 'Reset',
    robots_filters_apply: () => 'Apply',
  }),
}))

import {
  type IRobotsFilterDraft,
  RobotsFilterSheet,
} from '@/routes/_authenticated/operations/components/robots/-robots-filter-sheet'

describe('RobotsFilterSheet', () => {
  it('updates draft selections and applies them as robot search parameters', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const setFilterDraft = vi.fn()
    const draft: IRobotsFilterDraft = { tag_ids: [] }
    render(
      <RobotsFilterSheet
        filterDraft={draft}
        onOpenChange={onOpenChange}
        open
        setFilterDraft={setFilterDraft}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Model' }))
    expect(setFilterDraft.mock.calls[0][0](draft)).toEqual({ model: 'PRO', tag_ids: [] })

    await user.click(screen.getByRole('button', { name: 'Tags' }))
    expect(setFilterDraft.mock.calls[1][0](draft)).toEqual({ tag_ids: ['tag-1'] })

    await user.click(screen.getByRole('button', { name: 'Apply' }))
    expect(navigate).toHaveBeenCalledOnce()
    const search = navigate.mock.calls[0][0].search
    expect(search({ page: 3, search: 'milo' })).toEqual({
      page: 1,
      search: 'milo',
      model: undefined,
      operational_status: undefined,
      connection_status: undefined,
      tag_ids: undefined,
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('resets the draft and removes every filter from the URL', async () => {
    const user = userEvent.setup()
    const setFilterDraft = vi.fn()
    render(
      <RobotsFilterSheet
        filterDraft={{ model: 'PRO', connection_status: 'ONLINE', tag_ids: ['tag-1'] }}
        onOpenChange={vi.fn()}
        open
        setFilterDraft={setFilterDraft}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(setFilterDraft).toHaveBeenCalledWith({ tag_ids: [] })
    const search = navigate.mock.calls[0][0].search
    expect(search({ page: 2, model: 'PRO' })).toEqual({
      page: 1,
      model: undefined,
      operational_status: undefined,
      connection_status: undefined,
      tag_ids: undefined,
    })
  })
})
