import { useNavigate } from '@tanstack/react-router'
import { Filter, Plus, SearchIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import AppDialogComponent from '@/components/reusable/app-dialog/app-dialog-component'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDebounce } from '@/hooks/use-debounce'
import { getTranslations } from '@/lib/translation'
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

export function RobotsToolbar() {
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()
  const [openCreateDialog, setOpenCreateDialog] = useState(false)
  const [openFilters, setOpenFilters] = useState(false)
  const [searchInput, setSearchInput] = useState(search.search ?? '')
  const [filterDraft, setFilterDraft] = useState<IRobotsFilterDraft>(() => getFilterDraft(search))
  const debouncedSearch = useDebounce(searchInput, 500)

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

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
