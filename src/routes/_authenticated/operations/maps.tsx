import { createFileRoute } from '@tanstack/react-router'
import { TypographyH1 } from '@/components/ui/typography'
import { getTranslations } from '@/lib/translation'
import { MapsToolbar } from './components/maps/-maps-toolbar'

export const Route = createFileRoute('/_authenticated/operations/maps')({ component: MapsPage })
const t = getTranslations()

function MapsPage() {
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-6">
      <TypographyH1 className="text-2xl lg:text-3xl">{t.sidebar_maps()}</TypographyH1>
      <MapsToolbar />
    </section>
  )
}
