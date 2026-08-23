import { Plus } from 'lucide-react'
import { useState } from 'react'
import AppDialogComponent from '@/components/reusable/app-dialog/app-dialog-component'
import { Button } from '@/components/ui/button'
import { getTranslations } from '@/lib/translation'
import { CreateRobotDialog } from './-create-robot-dialog'

const t = getTranslations()
export function RobotsToolbar() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex justify-end">
      <Button onClick={() => setOpen(true)}>
        <Plus />
        {t.robot_create_trigger()}
      </Button>

      <AppDialogComponent
        open={open}
        setOpen={setOpen}
        title={t.robot_create_title()}
        footer={false}
        header={false}
        dialogTrigger={null}
        dialogProps={{
          className:
            'max-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden p-0 md:w-[min(92vw,72rem)] lg:h-[85vh] lg:w-[80vw] lg:max-w-none rounded-3xl',
        }}
      >
        <CreateRobotDialog setOpen={setOpen} />
      </AppDialogComponent>
    </div>
  )
}
