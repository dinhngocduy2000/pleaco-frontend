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
import { GroupRole, type GroupRoleType, LIST_ROLES } from '@/enum/group'
import { ROUTES } from '@/enum/routes'
import { getTranslations } from '@/lib/translation'

export type NavItem = {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  roles: GroupRoleType[]
}

export type NavGroup = {
  label: string
  icon: React.ComponentType<{ className?: string }>
  items: NavItem[]
  roles: GroupRoleType[]
}

export function getNavGroups(): NavGroup[] {
  const t = getTranslations()

  return [
    {
      label: t.sidebar_operations(),
      icon: Monitor,
      items: [
        { title: t.sidebar_maps(), url: ROUTES.MAPS, icon: MapIcon, roles: LIST_ROLES },
        { title: t.sidebar_robots(), url: ROUTES.ROBOTS, icon: Bot, roles: LIST_ROLES },
        {
          title: t.sidebar_cleaning_tasks(),
          url: ROUTES.CLEANING_TASKS,
          icon: ClipboardList,
          roles: LIST_ROLES,
        },
        {
          title: t.sidebar_live_monitoring(),
          url: ROUTES.LIVE_MONITORING,
          icon: Monitor,
          roles: LIST_ROLES,
        },
      ],
      roles: LIST_ROLES, // Replace with actual roles for operations
    },
    {
      label: t.sidebar_management(),
      icon: Truck,
      items: [
        { title: t.sidebar_fleets(), url: ROUTES.FLEETS, icon: Truck, roles: LIST_ROLES },
        {
          title: t.sidebar_schedules(),
          url: ROUTES.SCHEDULES,
          icon: CalendarClock,
          roles: LIST_ROLES,
        },
        {
          title: t.sidebar_incidents(),
          url: ROUTES.INCIDENTS,
          icon: OctagonAlert,
          roles: LIST_ROLES,
        },
      ],
      roles: LIST_ROLES, // Replace with actual roles for management
    },
    {
      label: t.sidebar_organization(),
      icon: UsersRound,
      items: [
        {
          title: t.sidebar_users(),
          url: ROUTES.USERS,
          icon: UsersRound,
          roles: [GroupRole.OWNER, GroupRole.ADMIN],
        },
        {
          title: t.sidebar_roles_permissions(),
          url: ROUTES.ROLES_AND_PERMISSIONS,
          icon: ShieldCheck,
          roles: [GroupRole.OWNER, GroupRole.ADMIN],
        },
        {
          title: t.sidebar_audit_logs(),
          url: ROUTES.AUDIT_LOGS,
          icon: FileSearch,
          roles: [GroupRole.OWNER, GroupRole.ADMIN],
        },
      ],
      roles: [GroupRole.OWNER, GroupRole.ADMIN], // Replace with actual roles for organization
    },
    {
      label: t.header_settings(),
      icon: Settings,
      items: [
        {
          title: t.group_settings(),
          url: ROUTES.TENANT_SETTINGS,
          icon: Settings,
          roles: [GroupRole.OWNER, GroupRole.ADMIN],
        },
      ],
      roles: [GroupRole.OWNER, GroupRole.ADMIN], // Replace with actual roles for settings
    },
  ]
}

export function isRouteActive(pathname: string, url: string) {
  return pathname === url || pathname.startsWith(`${url}/`)
}
