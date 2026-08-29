import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/vi'
import { Badge } from '@/components/ui/badge'
import { TypographyH2, TypographyP, TypographySmall } from '@/components/ui/typography'
import { MapStatus } from '@/enum/maps'
import type { IMapListInfo } from '@/interface/maps'
import { getCurrentLanguage, getTranslations } from '@/lib/translation'
import { MapGridPreview } from './-map-grid-preview'

dayjs.extend(relativeTime)

const t = getTranslations()

export const formatMapUpdatedAt = (updatedAt: string): string => {
  const date = dayjs(updatedAt)
  return date.isValid() ? date.locale(getCurrentLanguage()).fromNow() : '—'
}

const getStatusBadgeClassName = (status: IMapListInfo['status']) =>
  status === MapStatus.ASSIGNED
    ? 'border-green-700! bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
    : 'border-yellow-700! bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300'

type MapCardItemComponentProps = {
  map: IMapListInfo
}

export function MapCardItemComponent({ map }: MapCardItemComponentProps) {
  const visibleTags = map.tags.slice(0, 4)
  const remainingTags = map.tags.length - visibleTags.length

  return (
    <article aria-label={map.name} className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <MapGridPreview dimensionX={map.dimension_x} dimensionY={map.dimension_y} variant="card" />
      <div className="space-y-4 p-5">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <TypographyH2 className="min-w-0 truncate text-lg font-semibold border-0 pb-0">
              {map.name}
            </TypographyH2>
            <Badge className={getStatusBadgeClassName(map.status)} variant="outline">
              {map.status}
            </Badge>
          </div>
          <TypographyP className="line-clamp-2 not-first:mt-0 text-sm text-muted-foreground">
            {map.description || 'N/A'}
          </TypographyP>
        </div>
        <div className="border-t" />
        <dl className="space-y-3 mb-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">{t.map_card_dimensions()}</dt>
            <dd className="font-medium">{`${map.dimension_x} × ${map.dimension_y}`}</dd>
          </div>
          <div className="space-y-2 flex gap-2 items-center flex-wrap">
            <TypographyP className="text-muted-foreground mb-0">{t.map_card_tags()}</TypographyP>
            <dd className="flex flex-wrap gap-2">
              {visibleTags?.length ? (
                visibleTags.map((tag) => (
                  <Badge key={tag.id} variant="secondary">
                    {tag.name}
                  </Badge>
                ))
              ) : (
                <>N/A</>
              )}
              {remainingTags > 0 && <Badge variant="secondary">+ {remainingTags}</Badge>}
            </dd>
          </div>
        </dl>
        <TypographySmall className="text-xs text-muted-foreground">
          {t.map_card_updated({ time: formatMapUpdatedAt(map.updated_at) })}
        </TypographySmall>
      </div>
    </article>
  )
}
