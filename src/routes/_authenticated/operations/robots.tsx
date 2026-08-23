import { createFileRoute } from '@tanstack/react-router'
import {
  ROBOT_CONNECTION_STATUS,
  ROBOT_OPERATION_STATUS,
  type RobotConnectionStatusType,
  RobotModel,
  type RobotModelType,
  type RobotOperationStatusType,
} from '@/enum/robot'
import { getTranslations } from '@/lib/translation'
import { RobotsList } from './components/robots/-robots-list'
import { RobotsToolbar } from './components/robots/-robots-toolbar'

const parsePage = (value: unknown) => {
  const page = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(page) && page > 0 ? page : 1
}

const parseOptionalString = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined

const parseModel = (value: unknown): RobotModelType | undefined =>
  Object.values(RobotModel).includes(value as RobotModelType)
    ? (value as RobotModelType)
    : undefined

const parseOperationalStatus = (value: unknown): RobotOperationStatusType | undefined =>
  Object.values(ROBOT_OPERATION_STATUS).includes(value as RobotOperationStatusType)
    ? (value as RobotOperationStatusType)
    : undefined

const parseConnectionStatus = (value: unknown): RobotConnectionStatusType | undefined =>
  Object.values(ROBOT_CONNECTION_STATUS).includes(value as RobotConnectionStatusType)
    ? (value as RobotConnectionStatusType)
    : undefined

const parseTagIds = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined
  const tagIds = value.filter(
    (tagId): tagId is string => typeof tagId === 'string' && Boolean(tagId),
  )
  return tagIds.length > 0 ? tagIds : undefined
}

export const Route = createFileRoute('/_authenticated/operations/robots')({
  component: RobotsPage,
  validateSearch: (search) => ({
    page: parsePage(search.page),
    search: parseOptionalString(search.search),
    model: parseModel(search.model),
    operational_status: parseOperationalStatus(search.operational_status),
    connection_status: parseConnectionStatus(search.connection_status),
    tag_ids: parseTagIds(search.tag_ids),
  }),
})
const t = getTranslations()

function RobotsPage() {
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-6">
      <h1 className="text-2xl font-bold">{t.sidebar_robots()}</h1>
      <RobotsToolbar />
      <RobotsList />
    </section>
  )
}
