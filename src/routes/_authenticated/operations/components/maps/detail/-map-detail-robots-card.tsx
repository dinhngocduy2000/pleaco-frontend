import { useParams } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { TypographyMuted } from '@/components/ui/typography'
import { getTranslations } from '@/lib/translation'
import { useProfileQuery } from '@/queries/use-auth-query'
import { useMapDetailQuery } from '@/queries/use-maps-query'
import { MapDetailRobotItem } from './-map-detail-robot-item'

const t = getTranslations()

export function MapDetailRobotsCard() {
  const { map_id: mapId } = useParams({ from: '/_authenticated/operations/maps/$map_id' })
  const { data: profileResponse } = useProfileQuery()
  const { data: mapResponse } = useMapDetailQuery(mapId, profileResponse?.data.group_id ?? '')
  const robots = mapResponse?.data.robots ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.map_detail_assigned_robots({ count: robots.length })}</CardTitle>
      </CardHeader>
      <CardContent>
        {robots.length > 0 ? (
          <ul className="space-y-3">
            {robots.map((robot) => (
              <MapDetailRobotItem key={robot.id} robot={robot} />
            ))}
          </ul>
        ) : (
          <TypographyMuted>{t.map_detail_assigned_robots_empty()}</TypographyMuted>
        )}
      </CardContent>
      <CardFooter>
        <Button type="button" variant="outline" onClick={() => undefined}>
          {t.map_detail_manage_robot_assignment()}
        </Button>
      </CardFooter>
    </Card>
  )
}
