import { Link, useLocation } from '@tanstack/react-router'
import { ChevronRight, LayoutDashboard } from 'lucide-react'
import AppLogo from '@/assets/svgs/app-logo'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
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
import { getNavGroups, isRouteActive, type NavItem } from './sidebar_item'

function SidebarNavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton asChild isActive={isRouteActive(pathname, item.url)}>
        <Link to={item.url}>
          <item.icon className="size-4" />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  )
}

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation()
  const navGroups = getNavGroups()
  const t = getTranslations()
  const dashboardItem: NavItem = {
    title: t.sidebar_dashboard(),
    url: ROUTES.HOME,
    icon: LayoutDashboard,
  }

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
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={location.pathname === dashboardItem.url}>
                <Link to={dashboardItem.url}>
                  <dashboardItem.icon />
                  <span>{dashboardItem.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
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
                        <SidebarNavLink key={item.url} item={item} pathname={location.pathname} />
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
