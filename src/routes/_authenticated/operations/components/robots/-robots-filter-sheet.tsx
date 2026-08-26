import { useNavigate } from '@tanstack/react-router'
import { type Dispatch, type ReactNode, type SetStateAction, useMemo } from 'react'
import { AppSelectComponent } from '@/components/reusable/app-select-component/app-select-component'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  LIST_ROBOT_MODELS,
  ROBOT_CONNECTION_STATUS,
  ROBOT_OPERATION_STATUS,
  type RobotConnectionStatusType,
  type RobotModelType,
  type RobotOperationStatusType,
} from '@/enum/robot'
import type { IOption } from '@/interface/utils'
import { getTranslations } from '@/lib/translation'
import { useTagsQuery } from '@/queries/use-tags-query'
import { Route } from '../../robots'

const t = getTranslations()

function capitalizeLabel(value: string): string {
  return `${value.charAt(0)}${value.slice(1).toLowerCase()}`
}

const modelOptions: IOption[] = LIST_ROBOT_MODELS.map((model) => ({
  label: capitalizeLabel(model),
  value: model,
}))
const operationalStatusOptions: IOption[] = Object.values(ROBOT_OPERATION_STATUS).map((status) => ({
  label: capitalizeLabel(status),
  value: status,
}))
const connectionStatusOptions: IOption[] = Object.values(ROBOT_CONNECTION_STATUS).map((status) => ({
  label: capitalizeLabel(status),
  value: status,
}))

export type IRobotsFilterDraft = {
  model?: RobotModelType
  operational_status?: RobotOperationStatusType
  connection_status?: RobotConnectionStatusType
  tag_ids: string[]
}

type RobotsFilterSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  filterDraft: IRobotsFilterDraft
  setFilterDraft: Dispatch<SetStateAction<IRobotsFilterDraft>>
}

export function RobotsFilterSheet({
  open,
  onOpenChange,
  filterDraft,
  setFilterDraft,
}: RobotsFilterSheetProps) {
  const navigate = useNavigate({ from: Route.fullPath })
  const { data: listTagRepsonse } = useTagsQuery()
  const tagOptions: IOption[] = useMemo(
    () =>
      listTagRepsonse?.data.map((tag) => ({
        value: tag.id,
        label: tag.name,
      })) ?? [],
    [listTagRepsonse],
  )
  const selectedModel = modelOptions.find((option) => option.value === filterDraft.model)
  const selectedOperationalStatus = operationalStatusOptions.find(
    (option) => option.value === filterDraft.operational_status,
  )
  const selectedConnectionStatus = connectionStatusOptions.find(
    (option) => option.value === filterDraft.connection_status,
  )
  const selectedTags = tagOptions.filter((option) => filterDraft.tag_ids.includes(option.value))

  const handleApplyFilters = () => {
    navigate({
      search: (previous) => ({
        ...previous,
        page: 1,
        model: filterDraft.model,
        operational_status: filterDraft.operational_status,
        connection_status: filterDraft.connection_status,
        tag_ids: filterDraft.tag_ids.length > 0 ? filterDraft.tag_ids : undefined,
      }),
    })
    onOpenChange(false)
  }

  const handleResetFilters = () => {
    setFilterDraft({ tag_ids: [] })
    navigate({
      search: (previous) => ({
        ...previous,
        page: 1,
        model: undefined,
        operational_status: undefined,
        connection_status: undefined,
        tag_ids: undefined,
      }),
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t.robots_filters_title()}</SheetTitle>
          <SheetDescription>{t.robots_filters_description()}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
          <FilterSelect label={t.robots_filter_model()}>
            <AppSelectComponent
              options={modelOptions}
              placeholder={t.robots_filter_model()}
              value={selectedModel}
              onChange={(option) =>
                setFilterDraft((previous) => ({
                  ...previous,
                  model: option?.value as RobotModelType | undefined,
                }))
              }
            />
          </FilterSelect>
          <FilterSelect label={t.robots_filter_operational_status()}>
            <AppSelectComponent
              options={operationalStatusOptions}
              placeholder={t.robots_filter_operational_status()}
              value={selectedOperationalStatus}
              onChange={(option) =>
                setFilterDraft((previous) => ({
                  ...previous,
                  operational_status: option?.value as RobotOperationStatusType | undefined,
                }))
              }
            />
          </FilterSelect>
          <FilterSelect label={t.robots_filter_connection_status()}>
            <AppSelectComponent
              options={connectionStatusOptions}
              placeholder={t.robots_filter_connection_status()}
              value={selectedConnectionStatus}
              onChange={(option) =>
                setFilterDraft((previous) => ({
                  ...previous,
                  connection_status: option?.value as RobotConnectionStatusType | undefined,
                }))
              }
            />
          </FilterSelect>
          <FilterSelect label={t.robots_filter_tags()}>
            <AppSelectComponent
              multiple
              options={tagOptions}
              placeholder={t.robots_filter_tags()}
              emptyMessage={t.robots_filter_tags_empty()}
              value={selectedTags}
              onChange={(options) =>
                setFilterDraft((previous) => ({
                  ...previous,
                  tag_ids: options.map((option) => option.value),
                }))
              }
            />
          </FilterSelect>
        </div>
        <SheetFooter className="flex-row justify-end border-t">
          <Button variant="outline" onClick={handleResetFilters}>
            {t.robots_filters_reset()}
          </Button>
          <Button onClick={handleApplyFilters}>{t.robots_filters_apply()}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function FilterSelect({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 text-sm font-medium">
      <span>{label}</span>
      {children}
    </div>
  )
}
