import type { ReactNode } from 'react'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from './app_sidebar/app_sidebar'
import { SiteHeader } from './site_header/site_header'

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <SidebarProvider className="flex gap-2 w-full">
      <AppSidebar />
      <SidebarInset className="flex-1 overflow-auto">
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
