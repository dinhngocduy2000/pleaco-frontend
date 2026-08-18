import { useNavigate } from '@tanstack/react-router'
import { ArrowDownUp, SearchIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import AppDialogComponent from '@/components/reusable/app-dialog/app-dialog-component'
import AppDropdownMenu from '@/components/reusable/app-dropdown-menu/dropdown-menu'
import { AppSelectComponent } from '@/components/reusable/app-select-component/app-select-component'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { GroupMemberOrderDirectionType, GroupRoleType } from '@/enum/group'
import { GroupMemberOrderDirection, LIST_ROLES } from '@/enum/group'
import type { UserStatusType } from '@/enum/users'
import { UserStatus } from '@/enum/users'
import { useDebounce } from '@/hooks/use-debounce'
import type { IOption } from '@/interface/utils'
import { getTranslations } from '@/lib/translation'
import { Route } from '../tenant-settings'
import GroupInviteMember from './-group-invite-member'

const t = getTranslations()
const ALL_OPTION_VALUE = 'all'

function capitalizeLabel(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1).toLowerCase()}`
}

const roleOptions: IOption[] = [
  { label: t.group_members_filter_all(), value: ALL_OPTION_VALUE },
  ...LIST_ROLES.map((role) => ({
    label: capitalizeLabel(role),
    value: role,
  })),
]
const statusOptions: IOption[] = [
  { label: t.group_members_filter_all(), value: ALL_OPTION_VALUE },
  ...Object.values(UserStatus).map((status) => ({
    label: capitalizeLabel(status),
    value: status,
  })),
]

export function GroupMembersToolbar() {
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()
  const selectedRole = roleOptions.find((option) => option.value === search.role)
  const selectedStatus = statusOptions.find((option) => option.value === search.status)
  const [emailInput, setEmailInput] = useState(search.email ?? '')
  const [openInviteMemberModal, setOpenInviteMemberModal] = useState<boolean>(false)
  const debouncedEmail = useDebounce(emailInput, 500)

  useEffect(() => {
    if (debouncedEmail === (search.email ?? '')) return

    navigate({
      search: (previous) => ({
        ...previous,
        page: 1,
        email: debouncedEmail || undefined,
      }),
    })
  }, [debouncedEmail, navigate, search.email])
  const onOrderDirectionChange = (orderDirection: GroupMemberOrderDirectionType) => {
    navigate({ search: (previous) => ({ ...previous, page: 1, order_direction: orderDirection }) })
  }

  const onRoleChange = (role?: GroupRoleType) => {
    navigate({ search: (previous) => ({ ...previous, page: 1, role }) })
  }

  const onStatusChange = (status?: UserStatusType) => {
    navigate({ search: (previous) => ({ ...previous, page: 1, status }) })
  }
  return (
    <div className="flex flex-col md:flex-row w-full justify-between flex-wrap">
      <div className="flex flex-col gap-3 md:flex-row md:items-center flex-1">
        <div className="relative w-full md:max-w-sm">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label={t.group_members_search_placeholder()}
            className="pl-9"
            placeholder={t.group_members_search_placeholder()}
            value={emailInput}
            onChange={(event) => setEmailInput(event.target.value)}
          />
        </div>
        <AppDropdownMenu
          trigger={
            <>
              <ArrowDownUp />
              {search.order_direction === GroupMemberOrderDirection.ASC
                ? t.group_members_order_oldest()
                : t.group_members_order_newest()}
            </>
          }
          items={[
            {
              label: t.group_members_order_newest(),
              value: GroupMemberOrderDirection.DESC,
              onClick: () => onOrderDirectionChange(GroupMemberOrderDirection.DESC),
            },
            {
              label: t.group_members_order_oldest(),
              value: GroupMemberOrderDirection.ASC,
              onClick: () => onOrderDirectionChange(GroupMemberOrderDirection.ASC),
            },
          ]}
          contentAlign="start"
          selectedValue={search.order_direction}
        />
        <AppSelectComponent
          className="md:w-44"
          options={statusOptions}
          placeholder={t.group_members_filter_status_placeholder()}
          value={selectedStatus}
          onChange={(option) =>
            onStatusChange(
              option?.value === ALL_OPTION_VALUE ? undefined : (option?.value as UserStatusType),
            )
          }
        />
        <AppSelectComponent
          className="md:w-44"
          options={roleOptions}
          placeholder={t.group_members_filter_role_placeholder()}
          value={selectedRole}
          onChange={(option) =>
            onRoleChange(
              option?.value === ALL_OPTION_VALUE ? undefined : (option?.value as GroupRoleType),
            )
          }
        />
      </div>
      <AppDialogComponent
        open={openInviteMemberModal}
        setOpen={setOpenInviteMemberModal}
        title={t.group_invite_members()}
        footer={false}
        dialogTrigger={<Button>{t.group_invite_members()}</Button>}
      >
        <GroupInviteMember setOpen={setOpenInviteMemberModal} />
      </AppDialogComponent>
    </div>
  )
}
