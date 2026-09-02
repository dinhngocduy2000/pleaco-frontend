import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { INVITATION_STATUS } from '@/enum/group'

vi.mock('@/lib/translation', () => ({
  getTranslations: () => ({
    group_members_invitation_pending: () => 'Pending',
    group_members_invitation_rejected: () => 'Rejected',
    group_members_invitation_accepted: () => 'Accepted',
  }),
}))

import GroupMemberInvitationStatusBadge from '@/routes/_authenticated/organization/components/users/-group-members-invitation-status'

describe('GroupMemberInvitationStatusBadge', () => {
  it.each([
    [INVITATION_STATUS.PENDING, 'Pending'],
    [INVITATION_STATUS.REJECTED, 'Rejected'],
    [INVITATION_STATUS.ACCEPTED, 'Accepted'],
  ] as const)('renders the %s invitation state', (status, label) => {
    render(<GroupMemberInvitationStatusBadge status={status} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })
})
