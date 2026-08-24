import { useNavigate } from '@tanstack/react-router'
import { Bot } from 'lucide-react'
import { useMemo } from 'react'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import type { IRobotListRequest } from '@/interface/robots'
import { getTranslations } from '@/lib/translation'
import { useProfileQuery } from '@/queries/use-auth-query'
import { useRobotsQuery } from '@/queries/use-robots-query'
import { Route } from '../../robots'
import { BotCardItemComponent } from './-bot-card-item-component'
import { RobotsPagination } from './-robots-pagination'

const PAGE_SIZE = 10
const t = getTranslations()

export function RobotsList() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const { data: profileResponse, isLoading: isProfileLoading } = useProfileQuery()
  const groupId = profileResponse?.data.group_id
  const robotParams = useMemo<IRobotListRequest | undefined>(() => {
    if (!groupId) return undefined

    return {
      group_id: groupId,
      page: search.page,
      page_size: PAGE_SIZE,
      search: search.search,
      model: search.model,
      operational_status: search.operational_status,
      connection_status: search.connection_status,
      tag_ids: search.tag_ids,
    }
  }, [groupId, search])
  const {
    data: robotsResponse,
    isError,
    isLoading,
  } = useRobotsQuery({
    params: robotParams ?? { group_id: '', page: 1, page_size: PAGE_SIZE },
    enabled: Boolean(robotParams),
  })
  const robots = robotsResponse?.items ?? []
  const totalPages = Math.max(1, Math.ceil((robotsResponse?.total ?? 0) / PAGE_SIZE))
  const currentPage = Math.min(search.page, totalPages)

  const handlePageChange = (page: number) => {
    navigate({ search: (previous) => ({ ...previous, page }) })
  }

  if (isProfileLoading || isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Spinner />
        {t.robots_loading()}
      </div>
    )
  }

  if (!groupId) return <RobotsEmptyState title={t.robots_no_active_group()} />
  if (isError) return <RobotsEmptyState title={t.robots_error()} />
  if (robots.length === 0) return <RobotsEmptyState title={t.robots_empty()} />

  return (
    <>
      <div className="grid min-h-0 flex-1 content-start auto-rows-max gap-6 overflow-y-auto pr-2 md:grid-cols-2 2xl:grid-cols-3">
        {robots.map((robot) => (
          <BotCardItemComponent key={robot.id} robot={robot} />
        ))}
      </div>
      <RobotsPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </>
  )
}

function RobotsEmptyState({ title }: { title: string }) {
  return (
    <Empty className="flex-1">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Bot />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{t.robots_empty_description()}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
