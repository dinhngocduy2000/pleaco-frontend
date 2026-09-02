import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ROUTES } from '@/enum/routes'

const navigate = vi.hoisted(() => vi.fn())
const logout = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))
vi.mock('@/queries/use-auth-query', () => ({
  useLogoutMutation: () => ({ mutateAsync: logout }),
}))
vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  AvatarFallback: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  AvatarImage: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}))
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: React.PropsWithChildren<{ onClick?: () => void }>) => (
    <button onClick={onClick} type="button">
      {children}
    </button>
  ),
  DropdownMenuLabel: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  DropdownMenuPortal: ({ children }: React.PropsWithChildren) => <>{children}</>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuSub: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DropdownMenuSubContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DropdownMenuSubTrigger: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  DropdownMenuTrigger: ({ children }: React.PropsWithChildren) => <>{children}</>,
}))
vi.mock('@/lib/translation', () => ({
  getCurrentLanguage: () => 'en',
  getTranslations: () => ({
    header_settings: () => 'Settings',
    header_language: () => 'Language',
    header_language_en: () => 'English',
    header_language_vi: () => 'Vietnamese',
    header_logout: () => 'Log out',
    header_notifications: () => 'Notifications',
    header_no_notifications: () => 'No notifications',
  }),
  setCurrentLanguage: vi.fn(),
}))

import { ProfileDropdownComponent } from '@/components/layouts/profile_dropdown_component'

describe('ProfileDropdownComponent', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the authenticated user details, initials, and available menu actions', () => {
    render(
      <ProfileDropdownComponent
        user={{ name: 'Ada Lovelace', email: 'ada@example.com', image_url: null } as never}
      />,
    )

    expect(screen.getByText('ada@example.com')).toBeInTheDocument()
    expect(screen.getAllByText('AL')).not.toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument()
    expect(screen.getByText('English')).toBeInTheDocument()
    expect(screen.getByText('Vietnamese')).toBeInTheDocument()
  })

  it('navigates to settings and invokes the existing logout mutation', async () => {
    const user = userEvent.setup()
    render(<ProfileDropdownComponent user={{ name: 'Ada', email: 'ada@example.com' } as never} />)

    await user.click(screen.getByRole('button', { name: 'Settings' }))
    expect(navigate).toHaveBeenCalledWith({ to: ROUTES.TENANT_SETTINGS })

    await user.click(screen.getByRole('button', { name: 'Log out' }))
    expect(logout).toHaveBeenCalledOnce()
  })
})
