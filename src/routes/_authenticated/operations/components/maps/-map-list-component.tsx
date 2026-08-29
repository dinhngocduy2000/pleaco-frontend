import { useNavigate } from '@tanstack/react-router'
import { Map as MapIcon } from 'lucide-react'
import { useMemo } from 'react'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import type { IMapListRequest } from '@/interface/maps'
import { getTranslations } from '@/lib/translation'
import { useMapsQuery } from '@/queries/use-maps-query'
import { Route } from '../../maps'
import { MapCardItemComponent } from './-map-card-item-component'
import { MapsPagination } from './-maps-pagination'

const PAGE_SIZE = 10
const t = getTranslations()

export function MapsListComponent() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const mapParams = useMemo<IMapListRequest>(
    () => ({
      page: search.page,
      page_size: PAGE_SIZE,
      search: search.search,
      status: search.status,
      tag_ids: search.tag_ids,
      order_direction: search.order_direction,
    }),
    [search],
  )
  const { data: mapsResponse, isError, isLoading } = useMapsQuery({ params: mapParams })
  const maps = mapsResponse?.items ?? []
  const totalPages = Math.max(1, Math.ceil((mapsResponse?.total ?? 0) / PAGE_SIZE))
  const currentPage = Math.min(search.page, totalPages)

  const handlePageChange = (page: number) => {
    navigate({ search: (previous) => ({ ...previous, page }) })
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Spinner />
        {t.maps_loading()}
      </div>
    )
  }

  if (isError) return <MapsEmptyState title={t.maps_error()} />
  if (maps.length === 0) return <MapsEmptyState title={t.maps_empty()} />

  return (
    <>
      <div className="grid min-h-0 flex-1 content-start auto-rows-max gap-6 overflow-y-auto pr-2 md:grid-cols-2 xl:grid-cols-3">
        {maps.map((map) => (
          <MapCardItemComponent key={map.id} map={map} />
        ))}
      </div>
      <MapsPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </>
  )
}

function MapsEmptyState({ title }: { title: string }) {
  return (
    <Empty className="flex-1">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <MapIcon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{t.maps_empty_description()}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
