import {
  Bot,
  CalendarClock,
  ClipboardList,
  FileSearch,
  Map as MapIcon,
  Monitor,
  OctagonAlert,
  Settings,
  ShieldCheck,
  Truck,
  UsersRound,
} from 'lucide-react'
import { ROUTES } from '@/enum/routes'
import { getTranslations } from '@/lib/translation'

export type NavItem = {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
}

export type NavGroup = {
  label: string
  icon: React.ComponentType<{ className?: string }>
  items: NavItem[]
}

export function getNavGroups(): NavGroup[] {
  const t = getTranslations()

  return [
    {
      label: t.sidebar_operations(),
      icon: Monitor,
      items: [
        { title: t.sidebar_maps(), url: ROUTES.MAPS, icon: MapIcon },
        { title: t.sidebar_robots(), url: ROUTES.ROBOTS, icon: Bot },
        { title: t.sidebar_cleaning_tasks(), url: ROUTES.CLEANING_TASKS, icon: ClipboardList },
        { title: t.sidebar_live_monitoring(), url: ROUTES.LIVE_MONITORING, icon: Monitor },
      ],
    },
    {
      label: t.sidebar_management(),
      icon: Truck,
      items: [
        { title: t.sidebar_fleets(), url: ROUTES.FLEETS, icon: Truck },
        { title: t.sidebar_schedules(), url: ROUTES.SCHEDULES, icon: CalendarClock },
        { title: t.sidebar_incidents(), url: ROUTES.INCIDENTS, icon: OctagonAlert },
      ],
    },
    {
      label: t.sidebar_organization(),
      icon: UsersRound,
      items: [
        { title: t.sidebar_users(), url: ROUTES.USERS, icon: UsersRound },
        {
          title: t.sidebar_roles_permissions(),
          url: ROUTES.ROLES_AND_PERMISSIONS,
          icon: ShieldCheck,
        },
        { title: t.sidebar_audit_logs(), url: ROUTES.AUDIT_LOGS, icon: FileSearch },
      ],
    },
    {
      label: t.header_settings(),
      icon: Settings,
      items: [{ title: t.sidebar_tenant_settings(), url: ROUTES.TENANT_SETTINGS, icon: Settings }],
    },
  ]
}

export function isRouteActive(pathname: string, url: string) {
  return pathname === url || pathname.startsWith(`${url}/`)
}
