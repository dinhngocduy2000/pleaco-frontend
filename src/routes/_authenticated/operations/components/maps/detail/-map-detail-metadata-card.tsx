import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { TypographyMuted, TypographySmall } from '@/components/ui/typography'
import { MapZoneType } from '@/enum/maps'
import type { IMapDetailInfo } from '@/interface/maps'
import { getCurrentLanguage, getTranslations } from '@/lib/translation'
import { getMapDetailStatusClassName, getZoneCounts } from './-map-detail-utils'

const t = getTranslations()

type MapDetailMetadataCardProps = {
  map: IMapDetailInfo
}

const getUpdatedDate = (updatedAt: string) => {
  const date = new Date(updatedAt)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat(getCurrentLanguage(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function MapDetailMetadataCard({ map }: MapDetailMetadataCardProps) {
  const zoneCounts = getZoneCounts(map.zones)
  const regionLabels = {
    [MapZoneType.OBSTACLE]: t.map_detail_regions_obstacles(),
    [MapZoneType.NO_GO]: t.map_detail_regions_no_go(),
    [MapZoneType.CLEANING_ZONE]: t.map_detail_regions_cleaning(),
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.map_detail_title()}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">{map.name}</h2>
          <Badge className={getMapDetailStatusClassName(map.status)} variant="outline">
            {map.status}
          </Badge>
        </div>

        <TypographyMuted>{map.description || '—'}</TypographyMuted>

        <dl className="space-y-4 text-sm">
          <div>
            <dt className="text-muted-foreground">{t.map_detail_dimensions()}</dt>
            <dd className="mt-1 font-medium">
              {t.map_detail_dimensions_value({ x: map.dimension_x, y: map.dimension_y })}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t.map_detail_regions()}</dt>
            <dd className="mt-1 space-y-1 font-medium">
              {Object.entries(zoneCounts)
                .filter(([, count]) => count > 0)
                .map(([zoneType, count]) => (
                  <div key={zoneType}>
                    {t.map_detail_region_count({
                      count,
                      name: regionLabels[zoneType as keyof typeof regionLabels],
                    })}
                  </div>
                ))}
              {Object.values(zoneCounts).every((count) => count === 0) && (
                <div>{t.map_detail_regions_empty()}</div>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t.map_detail_tags()}</dt>
            <dd className="mt-2 flex flex-wrap gap-2">
              {map.tags.length > 0 ? (
                map.tags.map((tag) => (
                  <Badge key={tag.id} variant="secondary">
                    {tag.name}
                  </Badge>
                ))
              ) : (
                <TypographySmall>—</TypographySmall>
              )}
            </dd>
          </div>
        </dl>

        <TypographySmall className="text-muted-foreground">
          {t.map_detail_updated({ date: getUpdatedDate(map.updated_at) })}
        </TypographySmall>
      </CardContent>
      <CardFooter>
        <Button type="button" variant="outline" onClick={() => undefined}>
          {t.map_detail_edit_metadata()}
        </Button>
      </CardFooter>
    </Card>
  )
}
