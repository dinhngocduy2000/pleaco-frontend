import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Filter, Plus, SearchIcon, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import AppDialogComponent from '@/components/reusable/app-dialog/app-dialog-component'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BOTS_ENDPOINTS } from '@/enum/endpoints'
import { useDebounce } from '@/hooks/use-debounce'
import { getTranslations } from '@/lib/translation'
import { useTagsQuery } from '@/queries/use-tags-query'
import { Route } from '../../robots'
import { CreateRobotDialog } from './-create-robot-dialog'
import { type IRobotsFilterDraft, RobotsFilterSheet } from './-robots-filter-sheet'

const t = getTranslations()

const getFilterDraft = (search: ReturnType<typeof Route.useSearch>): IRobotsFilterDraft => ({
  model: search.model,
  operational_status: search.operational_status,
  connection_status: search.connection_status,
  tag_ids: search.tag_ids ?? [],
})

const formatFilterValue = (value: string) => `${value.charAt(0)}${value.slice(1).toLowerCase()}`

export function RobotsToolbar() {
  const navigate = useNavigate({ from: Route.fullPath })
  const queryClient = useQueryClient()
  const search = Route.useSearch()
  const { data: tagsResponse } = useTagsQuery()
  const [openCreateDialog, setOpenCreateDialog] = useState(false)
  const [openFilters, setOpenFilters] = useState(false)
  const [searchInput, setSearchInput] = useState(search.search ?? '')
  const [filterDraft, setFilterDraft] = useState<IRobotsFilterDraft>(() => getFilterDraft(search))
  const debouncedSearch = useDebounce(searchInput, 500)
  const activeFilters: { key: string; value: string; tagId?: string }[] = useMemo(() => {
    const tagNames = new Map(tagsResponse?.data.map((tag) => [tag.id, tag.name]))

    return [
      ...(search.model ? [{ key: 'model', value: formatFilterValue(search.model) }] : []),
      ...(search.operational_status
        ? [{ key: 'operational_status', value: formatFilterValue(search.operational_status) }]
        : []),
      ...(search.connection_status
        ? [{ key: 'connection_status', value: formatFilterValue(search.connection_status) }]
        : []),
      ...(search.tag_ids ?? []).map((tagId) => ({
        key: `tag-${tagId}`,
        tagId,
        value: tagNames.get(tagId) ?? tagId,
      })),
    ]
  }, [
    search.connection_status,
    search.model,
    search.operational_status,
    search.tag_ids,
    tagsResponse,
  ])

  useEffect(() => {
    const trimmedSearch = debouncedSearch.trim()
    if (trimmedSearch === (search.search ?? '')) return

    navigate({
      search: (previous) => ({
        ...previous,
        page: 1,
        search: trimmedSearch || undefined,
      }),
    })
  }, [debouncedSearch, navigate, search.search])

  const handleFiltersOpenChange = (open: boolean) => {
    setOpenFilters(open)
    if (open) setFilterDraft(getFilterDraft(search))
  }

  const handleRemoveFilter = (filterKey: string, tagId?: string) => {
    setFilterDraft((previous) => ({
      ...previous,
      ...(tagId
        ? { tag_ids: previous.tag_ids.filter((id) => id !== tagId) }
        : { [filterKey]: undefined }),
    }))
    navigate({
      search: (previous) => ({
        ...previous,
        page: 1,
        ...(tagId
          ? {
              tag_ids: previous.tag_ids?.filter((id) => id !== tagId) || undefined,
            }
          : { [filterKey]: undefined }),
      }),
    })
    void queryClient.invalidateQueries({ queryKey: [BOTS_ENDPOINTS.LIST] })
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="relative w-full sm:max-w-sm">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label={t.robots_search_placeholder()}
            className="pl-9"
            placeholder={t.robots_search_placeholder()}
            value={searchInput}
            defaultValue={search.search ?? ''}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activeFilters.map((filter) => (
              <Badge key={filter.key} variant="secondary">
                {filter.value}
                <button
                  type="button"
                  aria-label={`Remove ${filter.value} filter`}
                  className="rounded-full outline-none hover:cursor-pointer hover:text-gray-400 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X
                    aria-hidden="true"
                    size={14}
                    onClick={() => handleRemoveFilter(filter.key, filter.tagId)}
                  />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setOpenFilters(true)}>
          <Filter />
          {t.robots_filters_trigger()}
        </Button>
        <Button onClick={() => setOpenCreateDialog(true)}>
          <Plus />
          {t.robot_create_trigger()}
        </Button>
      </div>

      <AppDialogComponent
        open={openCreateDialog}
        setOpen={setOpenCreateDialog}
        title={t.robot_create_title()}
        footer={false}
        header={false}
        dialogTrigger={null}
        dialogProps={{
          className:
            'max-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-3xl p-0 md:w-[min(92vw,72rem)] lg:h-[85vh] lg:w-[80vw] lg:max-w-none',
        }}
      >
        <CreateRobotDialog setOpen={setOpenCreateDialog} />
      </AppDialogComponent>

      <RobotsFilterSheet
        open={openFilters}
        onOpenChange={handleFiltersOpenChange}
        filterDraft={filterDraft}
        setFilterDraft={setFilterDraft}
      />
    </div>
  )
}
