import { Link, useLocation } from '@tanstack/react-router'
import {
  Bookmark,
  ChevronRight,
  Compass,
  GaugeCircle,
  HelpCircle,
  Home,
  ImageIcon,
  LayoutDashboard,
  MessageSquare,
  MessagesSquare,
  Users,
} from 'lucide-react'
import AppLogo from '@/assets/svgs/app-logo'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { ROUTES } from '@/enum/routes'
import { getTranslations } from '@/lib/translation'

const t = getTranslations()

type NavItem = {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
}

type NavGroup = {
  label: string
  icon: React.ComponentType<{ className?: string }>
  items: NavItem[]
}

function getNavGroups(): NavGroup[] {
  return [
    {
      label: t.sidebar_platform(),
      icon: Compass,
      items: [
        { title: t.sidebar_home(), url: ROUTES.HOME, icon: Home },
        { title: t.sidebar_memories(), url: ROUTES.MEMORIES, icon: ImageIcon },
        { title: t.sidebar_saved_destinations(), url: ROUTES.SAVED_DESTINATIONS, icon: Bookmark },
        { title: t.sidebar_chatbox(), url: ROUTES.CHATBOX, icon: MessageSquare },
        { title: t.sidebar_instructions(), url: ROUTES.INSTRUCTIONS, icon: HelpCircle },
        { title: t.sidebar_feedback(), url: ROUTES.FEEDBACK, icon: MessagesSquare },
      ],
    },
    {
      label: t.sidebar_admin(),
      icon: GaugeCircle,
      items: [
        { title: t.sidebar_manage_group(), url: ROUTES.ADMIN_MANAGE_GROUP, icon: Users },
        { title: t.sidebar_dashboard(), url: ROUTES.ADMIN_DASHBOARD, icon: LayoutDashboard },
        { title: t.sidebar_admin_feedback(), url: ROUTES.ADMIN_FEEDBACK, icon: MessagesSquare },
      ],
    },
  ]
}

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation()
  const navGroups = getNavGroups()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="h-20 flex justify-center items-center w-full"
            >
              <AppLogo />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              <Collapsible defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={group.label}>
                      <group.icon />
                      <span>{group.label}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {group.items.map((item) => (
                        <SidebarMenuSubItem key={item.url}>
                          <SidebarMenuSubButton asChild isActive={location.pathname === item.url}>
                            <Link to={item.url}>
                              <item.icon className="size-4" />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
