import { useNavigate } from '@tanstack/react-router'
import { ArrowDownUp, Plus, SearchIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import AppDialogComponent from '@/components/reusable/app-dialog/app-dialog-component'
import AppDropdownMenu from '@/components/reusable/app-dropdown-menu/dropdown-menu'
import { AppSelectComponent } from '@/components/reusable/app-select-component/app-select-component'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  MapOrderDirection,
  type MapOrderDirectionType,
  MapStatus,
  type MapStatusType,
} from '@/enum/maps'
import { useDebounce } from '@/hooks/use-debounce'
import type { IOption } from '@/interface/utils'
import { getTranslations } from '@/lib/translation'
import { useTagsQuery } from '@/queries/use-tags-query'
import { Route } from '../../maps'
import { MapCreateModal } from './-map-create-modal'

const t = getTranslations()
const ALL_OPTION_VALUE = 'all'

const statusOptions: IOption[] = [
  { label: t.maps_filter_all(), value: ALL_OPTION_VALUE },
  { label: t.maps_status_assigned(), value: MapStatus.ASSIGNED },
  { label: t.maps_status_unassigned(), value: MapStatus.UNASSIGNED },
]

export function MapsToolbar() {
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()
  const { data: tagsResponse } = useTagsQuery()
  const [openCreateDialog, setOpenCreateDialog] = useState(false)
  const [searchInput, setSearchInput] = useState(search.search ?? '')
  const debouncedSearch = useDebounce(searchInput, 500)
  const selectedStatus = statusOptions.find((option) => option.value === search.status)
  const tagOptions = useMemo<IOption[]>(
    () => tagsResponse?.data.map((tag) => ({ label: tag.name, value: tag.id })) ?? [],
    [tagsResponse],
  )
  const selectedTags = useMemo(
    () => tagOptions.filter((option) => search.tag_ids?.includes(option.value)),
    [search.tag_ids, tagOptions],
  )

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

  const handleStatusChange = (option: IOption | undefined) => {
    navigate({
      search: (previous) => ({
        ...previous,
        page: 1,
        status:
          option?.value === ALL_OPTION_VALUE
            ? undefined
            : (option?.value as MapStatusType | undefined),
      }),
    })
  }

  const handleTagChange = (options: IOption[]) => {
    navigate({
      search: (previous) => ({
        ...previous,
        page: 1,
        tag_ids: options.length > 0 ? options.map((option) => option.value) : undefined,
      }),
    })
  }

  const handleOrderDirectionChange = (orderDirection: MapOrderDirectionType) => {
    navigate({
      search: (previous) => ({ ...previous, page: 1, order_direction: orderDirection }),
    })
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap min-w-0 flex-1 flex-col gap-2 sm:flex-row">
        <div className="relative w-full sm:max-w-sm">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label={t.maps_search_placeholder()}
            className="pl-9"
            placeholder={t.maps_search_placeholder()}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
        <AppSelectComponent
          className="sm:w-44"
          options={statusOptions}
          placeholder={t.maps_filter_placeholder()}
          value={selectedStatus}
          onChange={handleStatusChange}
        />
        <AppSelectComponent
          className="sm:w-52"
          options={tagOptions}
          multiple
          placeholder={t.maps_tags_placeholder()}
          value={selectedTags}
          onChange={handleTagChange}
        />
        <AppDropdownMenu
          contentAlign="start"
          trigger={
            <>
              <ArrowDownUp />
              {search.order_direction === MapOrderDirection.ASC
                ? t.maps_sort_ascending()
                : t.maps_sort_descending()}
            </>
          }
          items={[
            {
              label: t.maps_sort_descending(),
              value: MapOrderDirection.DESC,
              onClick: () => handleOrderDirectionChange(MapOrderDirection.DESC),
            },
            {
              label: t.maps_sort_ascending(),
              value: MapOrderDirection.ASC,
              onClick: () => handleOrderDirectionChange(MapOrderDirection.ASC),
            },
          ]}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setOpenCreateDialog(true)}>
          <Plus />
          {t.map_create_trigger()}
        </Button>
      </div>
      <AppDialogComponent
        open={openCreateDialog}
        setOpen={setOpenCreateDialog}
        title={t.map_create_title()}
        footer={false}
        header={false}
        dialogTrigger={null}
        dialogProps={{
          className:
            'max-h-[calc(100vh-2rem)] sm:max-w-6xl overflow-hidden rounded-3xl p-0 md:w-[min(92vw,92rem)] lg:h-[85vh] lg:w-[85vw] lg:max-w-none',
        }}
      >
        <MapCreateModal setOpen={setOpenCreateDialog} />
      </AppDialogComponent>
    </div>
  )
}
