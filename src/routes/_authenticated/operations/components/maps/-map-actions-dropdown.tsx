import { Eye, MoreVertical, PencilLine, Trash2 } from 'lucide-react'
import AppDropdownMenu from '@/components/reusable/app-dropdown-menu/dropdown-menu'
import { TypographySmall } from '@/components/ui/typography'
import { getTranslations } from '@/lib/translation'

const t = getTranslations()

export function MapActionsDropdown() {
  return (
    <AppDropdownMenu
      trigger={
        <>
          <MoreVertical aria-hidden="true" />
          <TypographySmall className="sr-only">{t.map_card_menu_label()}</TypographySmall>
        </>
      }
      triggerVariant="ghost"
      items={[
        {
          label: (
            <>
              <Eye className="text-primary" />
              {t.map_card_menu_view_details()}
            </>
          ),
          value: 'view-details',
          onClick: () => undefined,
        },
        {
          label: (
            <>
              <PencilLine className="text-violet-700 dark:text-violet-300" />
              {t.edit()}
            </>
          ),
          value: 'edit',
          onClick: () => undefined,
        },
        {
          label: (
            <>
              <Trash2 className="text-destructive" />
              {t.map_card_menu_delete()}
            </>
          ),
          value: 'delete',
          onClick: () => undefined,
        },
      ]}
    />
  )
}
