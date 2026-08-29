import { createFileRoute } from '@tanstack/react-router'
import { TypographyH1 } from '@/components/ui/typography'
import {
  MapOrderDirection,
  type MapOrderDirectionType,
  MapStatus,
  type MapStatusType,
} from '@/enum/maps'
import { getTranslations } from '@/lib/translation'
import { MapsListComponent } from './components/maps/-map-list-component'
import { MapsToolbar } from './components/maps/-maps-toolbar'

const parsePage = (value: unknown) => {
  const page = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(page) && page > 0 ? page : 1
}

const parseOptionalString = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined

const parseStatus = (value: unknown): MapStatusType | undefined =>
  Object.values(MapStatus).includes(value as MapStatusType) ? (value as MapStatusType) : undefined

const parseTagIds = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined

  const tagIds = value.filter(
    (tagId): tagId is string => typeof tagId === 'string' && Boolean(tagId),
  )
  return tagIds.length > 0 ? tagIds : undefined
}

const parseOrderDirection = (value: unknown): MapOrderDirectionType =>
  Object.values(MapOrderDirection).includes(value as MapOrderDirectionType)
    ? (value as MapOrderDirectionType)
    : MapOrderDirection.DESC

export const Route = createFileRoute('/_authenticated/operations/maps')({
  component: MapsPage,
  validateSearch: (search) => ({
    page: parsePage(search.page),
    search: parseOptionalString(search.search),
    status: parseStatus(search.status),
    tag_ids: parseTagIds(search.tag_ids),
    order_direction: parseOrderDirection(search.order_direction),
  }),
})
const t = getTranslations()

function MapsPage() {
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-6">
      <TypographyH1 className="text-2xl lg:text-3xl">{t.sidebar_maps()}</TypographyH1>
      <MapsToolbar />
      <MapsListComponent />
    </section>
  )
}
