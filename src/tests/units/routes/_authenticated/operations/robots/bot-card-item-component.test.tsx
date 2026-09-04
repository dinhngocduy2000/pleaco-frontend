import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ROBOT_CONNECTION_STATUS, ROBOT_OPERATION_STATUS, RobotModel } from '@/enum/robot'
import type { IRobotInfo } from '@/interface/robots'
import { BotCardItemComponent } from '@/routes/_authenticated/operations/components/robots/-bot-card-item-component'

const robot: IRobotInfo = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Milo',
  serial_num: 'PLC-L-0012',
  model: RobotModel.LITE,
  map_name: 'Lobby — Floor 1',
  ip_address: '192.168.10.21',
  operational_status: ROBOT_OPERATION_STATUS.CHARGING,
  connection_status: ROBOT_CONNECTION_STATUS.ONLINE,
  created_at: '2026-08-23T00:00:00.000Z',
  tags: [
    { id: '00000000-0000-4000-8000-000000000002', name: 'Lobby', color: '#2563eb' },
    { id: '00000000-0000-4000-8000-000000000003', name: 'Floor 1', color: '#16a34a' },
    { id: '00000000-0000-4000-8000-000000000004', name: 'Day Shift', color: '#f59e0b' },
  ],
}

describe('BotCardItemComponent', () => {
  it('renders robot details, statuses, battery progress, tags, and menu options', async () => {
    const user = userEvent.setup()

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    render(
      <QueryClientProvider client={queryClient}>
        <BotCardItemComponent robot={robot} />
      </QueryClientProvider>,
    )

    expect(screen.getByRole('heading', { name: 'Milo' })).toBeInTheDocument()
    expect(screen.getByText('PLC-L-0012')).toBeInTheDocument()
    expect(screen.getByText('LITE')).toBeInTheDocument()
    expect(screen.getByText('Charging')).toBeInTheDocument()
    expect(screen.getByText('Lobby — Floor 1')).toBeInTheDocument()
    expect(screen.getByText('192.168.10.21')).toBeInTheDocument()
    expect(screen.getByText('Lobby')).toBeInTheDocument()
    expect(screen.getByText('Floor 1')).toBeInTheDocument()
    expect(screen.getByText('Day Shift')).toBeInTheDocument()
    expect(screen.getByText('Online')).toBeInTheDocument()
    expect(screen.getByLabelText('Battery 64%')).toHaveAttribute('data-slot', 'progress')
    expect(screen.getByLabelText('Battery 64%')).toHaveClass(
      '[&_[data-slot=progress-indicator]]:bg-yellow-500',
    )

    await user.click(screen.getByRole('button', { name: 'Robot options: Milo' }))

    expect(await screen.findByText('Delete')).toBeInTheDocument()
    expect(screen.getByText('Deactivate')).toBeInTheDocument()
    expect(screen.getByText('Edit')).toBeInTheDocument()
  })
})
