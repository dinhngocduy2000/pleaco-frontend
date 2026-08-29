import { Plus, SearchIcon } from 'lucide-react'
import { useState } from 'react'
import AppDialogComponent from '@/components/reusable/app-dialog/app-dialog-component'
import AppDropdownMenu from '@/components/reusable/app-dropdown-menu/dropdown-menu'
import { AppSelectComponent } from '@/components/reusable/app-select-component/app-select-component'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getTranslations } from '@/lib/translation'
import { MapCreateModal } from './-map-create-modal'

const t = getTranslations()

export function MapsToolbar() {
  const [openCreateDialog, setOpenCreateDialog] = useState(false)

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
        <div className="relative w-full sm:max-w-sm">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label={t.maps_search_placeholder()}
            className="pl-9"
            placeholder={t.maps_search_placeholder()}
          />
        </div>
        <AppSelectComponent
          options={[]}
          placeholder={t.maps_filter_placeholder()}
          value={undefined}
          onChange={() => undefined}
        />
        <AppDropdownMenu items={[]} trigger={t.maps_sort_placeholder()} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setOpenCreateDialog(true)}>
          <Plus />
          {t.map_create_trigger()}
        </Button>
      </div>
      <AppDialogComponent
        open={openCreateDialog}
        setOpen={setOpenCreateDialog}
        title={t.map_create_title()}
        footer={false}
        header={false}
        dialogTrigger={null}
        dialogProps={{
          className:
            'max-h-[calc(100vh-2rem)] sm:max-w-6xl overflow-hidden rounded-3xl p-0 md:w-[min(92vw,92rem)] lg:h-[85vh] lg:w-[85vw] lg:max-w-none',
        }}
      >
        <MapCreateModal setOpen={setOpenCreateDialog} />
      </AppDialogComponent>
    </div>
  )
}
