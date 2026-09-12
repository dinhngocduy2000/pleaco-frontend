import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Map as MapIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { MapOrderDirection } from '@/enum/maps'
import type { IMapDetailInfo } from '@/interface/maps'
import { getTranslations } from '@/lib/translation'
import { useProfileQuery } from '@/queries/use-auth-query'
import { useMapDetailQuery } from '@/queries/use-maps-query'
import { MapDetailGrid } from '@/routes/_authenticated/operations/components/maps/detail/-map-detail-grid'
import { MapDetailMetadataCard } from '@/routes/_authenticated/operations/components/maps/detail/-map-detail-metadata-card'
import { MapDetailRobotsCard } from '@/routes/_authenticated/operations/components/maps/detail/-map-detail-robots-card'

const t = getTranslations()

export const Route = createFileRoute('/_authenticated/operations/maps/$map_id')({
  component: MapDetailPage,
})

function MapDetailPage() {
  const { map_id: mapId } = Route.useParams()
  const { data: profileResponse } = useProfileQuery()
  const {
    data: mapResponse,
    isError,
    isLoading,
  } = useMapDetailQuery(mapId, profileResponse?.data.group_id ?? '')

  return <MapDetailPageContent error={isError} isLoading={isLoading} map={mapResponse?.data} />
}

type MapDetailPageContentProps = {
  error: boolean
  isLoading: boolean
  map?: IMapDetailInfo
}

export function MapDetailPageContent({ error, isLoading, map }: MapDetailPageContentProps) {
  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Spinner />
        {t.map_detail_loading()}
      </div>
    )
  }

  if (error || !map) {
    return (
      <Empty className="flex-1">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MapIcon />
          </EmptyMedia>
          <EmptyTitle>{t.map_detail_error()}</EmptyTitle>
          <EmptyDescription>{t.map_detail_error_description()}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button aria-label={t.map_detail_back_to_maps()} asChild size="icon" variant="ghost">
          <Link
            search={{
              page: 1,
              search: undefined,
              status: undefined,
              tag_ids: undefined,
              order_direction: MapOrderDirection.DESC,
            }}
            to="/operations/maps"
          >
            <ArrowLeft aria-hidden="true" />
          </Link>
        </Button>
        <h1 className="min-w-0 truncate text-2xl font-bold lg:text-3xl">{map.name}</h1>
      </div>
      <div className="flex min-h-0 flex-1 flex-wrap items-stretch gap-4 overflow-y-auto pr-2">
        <MapDetailGrid map={map} />
        <aside className="flex min-w-72 flex-1 basis-[calc((100%-1rem)/2)] flex-col gap-4">
          <MapDetailMetadataCard map={map} />
          <MapDetailRobotsCard robots={map.robots} />
        </aside>
      </div>
    </section>
  )
}
