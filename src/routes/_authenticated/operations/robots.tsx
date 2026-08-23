import { createFileRoute } from '@tanstack/react-router'
import { ROBOT_CONNECTION_STATUS, ROBOT_OPERATION_STATUS, RobotModel } from '@/enum/robot'
import type { IRobotInfo } from '@/interface/robots'
import { getTranslations } from '@/lib/translation'
import { BotCardItemComponent } from './components/robots/-bot-card-item-component'
import { RobotsToolbar } from './components/robots/-robots-toolbar'

export const Route = createFileRoute('/_authenticated/operations/robots')({ component: RobotsPage })
const t = getTranslations()

const demoRobot: IRobotInfo = {
  name: 'Milo',
  serial_num: 'PLC-L-0012',
  model: RobotModel.PRO,
  map_name: 'Lobby — Floor 1',
  ip_address: '192.168.10.21',
  operational_status: ROBOT_OPERATION_STATUS.CHARGING,
  connection_status: ROBOT_CONNECTION_STATUS.ONLINE,
  created_at: '2026-08-23T00:00:00.000Z',
}

function RobotsPage() {
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">{t.sidebar_robots()}</h1>
      <RobotsToolbar />
      <BotCardItemComponent robot={demoRobot} />
    </section>
  )
}
