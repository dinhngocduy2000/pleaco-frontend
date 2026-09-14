import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Map as MapIcon, ScanLine } from 'lucide-react'
import { useState } from 'react'
import AppDialogComponent from '@/components/reusable/app-dialog/app-dialog-component'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { TypographyH3 } from '@/components/ui/typography'
import { GroupRole } from '@/enum/group'
import { MapOrderDirection } from '@/enum/maps'
import { hasRoleAccess } from '@/lib/role-access'
import { getTranslations } from '@/lib/translation'
import { useProfileQuery } from '@/queries/use-auth-query'
import { useMapDetailQuery } from '@/queries/use-maps-query'
import { MapBoundaryStep } from '@/routes/_authenticated/operations/components/maps/-map-boundary-step'
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
  const [adjustLayoutOpen, setAdjustLayoutOpen] = useState(false)
  const [isSavingLayout, setIsSavingLayout] = useState(false)
  const {
    data: mapResponse,
    isError,
    isLoading,
  } = useMapDetailQuery(mapId, profileResponse?.data.group_id ?? '')

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Spinner />
        {t.map_detail_loading()}
      </div>
    )
  }

  if (isError || !mapResponse?.data) {
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

  const map = mapResponse.data
  const canAdjustBoundary = hasRoleAccess(profileResponse?.data.group?.role, [
    GroupRole.ADMIN,
    GroupRole.OWNER,
  ])
  const boundaryEditorMap = {
    id: map.id,
    name: map.name,
    dimension_x: map.dimension_x,
    dimension_y: map.dimension_y,
    geometry: map.boundary ?? undefined,
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="flex w-full items-center justify-between gap-3">
        <Button
          aria-label={t.map_detail_back_to_maps()}
          size="icon"
          variant="ghost"
          className="w-fit"
        >
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
          <TypographyH3 role="heading" className="min-w-0 w-fit truncate font-bold">
            {map.name}
          </TypographyH3>
        </Button>
        {canAdjustBoundary && (
          <Button variant="outline" type="button" onClick={() => setAdjustLayoutOpen(true)}>
            <ScanLine aria-hidden="true" />
            {t.map_boundary_adjust_title()}
          </Button>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-wrap items-stretch gap-4 overflow-y-auto pr-2">
        <MapDetailGrid map={map} />
        <aside className="flex min-w-72 flex-1 basis-[calc((100%-1rem)/2)] flex-col gap-4">
          <MapDetailMetadataCard map={map} />
          <MapDetailRobotsCard robots={map.robots} />
        </aside>
      </div>
      <AppDialogComponent
        disableClickOverlay={isSavingLayout}
        dialogProps={{
          className:
            'max-h-[calc(100vh-2rem)] overflow-hidden rounded-3xl p-0 sm:max-w-6xl md:w-[min(92vw,92rem)] lg:h-[85vh] lg:w-[50vw] lg:max-w-none',
        }}
        dialogTrigger={null}
        footer={false}
        header={false}
        open={adjustLayoutOpen}
        setOpen={setAdjustLayoutOpen}
        title={t.map_boundary_adjust_title()}
      >
        <MapBoundaryStep
          map={boundaryEditorMap}
          mode="adjust"
          zones={map.zones}
          onClose={() => setAdjustLayoutOpen(false)}
          onSavingChange={setIsSavingLayout}
        />
      </AppDialogComponent>
    </section>
  )
}
