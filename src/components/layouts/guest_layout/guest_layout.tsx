import { useLocation } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import AppLogo from '@/assets/svgs/app-logo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ROUTES } from '@/enum/routes'
import { getTranslations } from '@/lib/translation'

interface GuestLayoutProps {
  children: ReactNode
}

export function GuestLayout({ children }: GuestLayoutProps) {
  const location = useLocation()
  const pathname = location.pathname
  const translations = getTranslations()
  const renderCardHeader = () => {
    if (pathname === ROUTES.REGISTER) {
      return {
        title: translations.register_title(),
        description: translations.register_description(),
        testId: 'register_title',
        testIdDescription: 'register_description',
      }
    }
    if (pathname === ROUTES.LOGIN) {
      return {
        title: translations.login_title(),
        description: translations.login_description(),
        testId: 'login_title',
        testIdDescription: 'login_description',
      }
    }
    return {
      title: '',
      description: '',
      testId: '',
      testIdDescription: '',
    }
  }
  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <main className="flex-1">
        <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-8 items-center justify-center px-4 py-12">
          <AppLogo className="size-40" />
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle data-testid={renderCardHeader().testId} className="text-2xl">
                {renderCardHeader().title}
              </CardTitle>
              <CardDescription data-testid={renderCardHeader().testIdDescription}>
                {renderCardHeader().description}
              </CardDescription>
            </CardHeader>
            <CardContent>{children}</CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
