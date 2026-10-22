import { useRouterState } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { useGroupRobotStatusSocket } from '@/hooks/use-robot-status-socket'
import { useProfileQuery } from '@/queries/use-auth-query'
import { AppSidebar } from './app_sidebar/app_sidebar'
import { SiteHeader } from './site_header/site_header'

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const hasMapId = useRouterState({
    select: (state) =>
      state.matches.some(
        (match) => 'map_id' in match.params && typeof match.params.map_id === 'string',
      ),
  })
  const { data: profileResponse, isSuccess } = useProfileQuery()

  useGroupRobotStatusSocket({
    activeGroupId: profileResponse?.data.group_id ?? undefined,
    enabled: isSuccess && !hasMapId,
  })

  return (
    <SidebarProvider className="flex h-svh min-h-0 w-full gap-2 overflow-hidden">
      <AppSidebar />
      <SidebarInset className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <SiteHeader />
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
