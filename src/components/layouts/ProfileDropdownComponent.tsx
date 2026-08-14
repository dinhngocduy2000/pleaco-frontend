import { useNavigate } from '@tanstack/react-router'
import {
  Bell,
  Check,
  CreditCard,
  Globe,
  LogOut,
  type LucideIcon,
  Settings,
  User,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LANGUAGE } from '@/enum/language'
import { ROUTES } from '@/enum/routes'
import type { IUserProfileDetail } from '@/interface/auth'
import { getCurrentLanguage, getTranslations, setCurrentLanguage } from '@/lib/translation'
import { useLogoutMutation } from '@/queries/use-auth-query'
import { TypographyP, TypographySmall } from '../ui/typography'

type MenuItemEntry = { type: 'item'; icon: LucideIcon; label: string; onClick: () => void }
type MenuSeparator = { type: 'separator'; key: string }
type MenuSubEntry = {
  type: 'sub'
  icon: LucideIcon
  label: string
  items: { label: string; onClick: () => void; active: boolean }[]
}
type MenuEntry = MenuItemEntry | MenuSeparator | MenuSubEntry

const t = getTranslations()

function profileInitials(name: string | undefined): string {
  if (!name?.trim()) return ''
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  const first = parts[0][0] ?? ''
  const last = parts[parts.length - 1][0] ?? ''
  return (first + last).toUpperCase()
}

export function ProfileDropdownComponent({ user }: { user?: IUserProfileDetail }) {
  const navigate = useNavigate()
  const { mutateAsync: logout } = useLogoutMutation()
  const currentLanguage = getCurrentLanguage()

  const avatarSrc = user?.image_url?.trim() ? user.image_url : undefined
  const initials = profileInitials(user?.name)

  const handleLogout = async () => {
    await logout()
  }

  const handleLanguageChange = (language: LANGUAGE) => {
    setCurrentLanguage(language)
    window.location.reload()
  }

  const menuItems: MenuEntry[] = [
    {
      type: 'item',
      icon: Settings,
      label: t.header_settings(),
      onClick: () => navigate({ to: ROUTES.SETTINGS as string }),
    },
    {
      type: 'item',
      icon: CreditCard,
      label: t.header_subscriptions(),
      onClick: () => navigate({ to: ROUTES.SUBSCRIPTIONS as string }),
    },
    {
      type: 'sub',
      icon: Globe,
      label: t.header_language(),
      items: [
        {
          label: t.header_language_en(),
          onClick: () => handleLanguageChange(LANGUAGE.EN),
          active: currentLanguage === LANGUAGE.EN,
        },
        {
          label: t.header_language_vi(),
          onClick: () => handleLanguageChange(LANGUAGE.VI),
          active: currentLanguage === LANGUAGE.VI,
        },
      ],
    },
    { type: 'separator', key: 'logout-separator' },
    { type: 'item', icon: LogOut, label: t.header_logout(), onClick: handleLogout },
  ]

  return (
    <div className="ml-auto flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="size-5" />
            <span className="sr-only">{t.header_notifications()}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>{t.header_notifications()}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="p-4 text-center text-sm text-muted-foreground">
            {t.header_no_notifications()}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Avatar className="size-8">
              {avatarSrc ? <AvatarImage src={avatarSrc} alt={user?.name ?? ''} /> : null}
              <AvatarFallback delayMs={avatarSrc ? 200 : 0}>
                {initials || <User className="size-4" />}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {user ? (
            <>
              <DropdownMenuItem>
                <Avatar className="size-6">
                  {avatarSrc ? <AvatarImage src={avatarSrc} alt={user?.name ?? ''} /> : null}
                  <AvatarFallback delayMs={avatarSrc ? 200 : 0}>
                    {initials || <User className="size-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1 truncate">
                  <TypographyP className="text-sm font-medium leading-none">
                    {user.name}
                  </TypographyP>
                  <TypographySmall
                    title={user.email}
                    className="text-xs mt-0! leading-none text-muted-foreground truncate"
                  >
                    {user.email}
                  </TypographySmall>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : null}

          {menuItems.map((entry) => {
            if (entry.type === 'separator') {
              return <DropdownMenuSeparator key={entry.key} />
            }

            if (entry.type === 'sub') {
              return (
                <DropdownMenuSub key={entry.label}>
                  <DropdownMenuSubTrigger>
                    <entry.icon className="mr-2 size-4" />
                    {entry.label}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      {entry.items.map((subItem) => (
                        <DropdownMenuItem key={subItem.label} onClick={subItem.onClick}>
                          {subItem.label}
                          {subItem.active && <Check className="ml-auto size-4" />}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              )
            }

            return (
              <DropdownMenuItem key={entry.label} onClick={entry.onClick}>
                <entry.icon className="mr-2 size-4" />
                {entry.label}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
