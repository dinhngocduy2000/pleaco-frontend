import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { IMapDetailInfo } from '@/interface/maps'

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  useTagsQuery: vi.fn(),
  toast: { error: vi.fn(), success: vi.fn() },
}))
vi.mock('sonner', () => ({ toast: mocks.toast }))
vi.mock('@/queries/use-maps-query', () => ({
  useUpdateMapMetadataMutation: () => ({ mutateAsync: mocks.mutateAsync, isPending: false }),
}))
vi.mock('@/queries/use-tags-query', () => ({ useTagsQuery: mocks.useTagsQuery }))
vi.mock('@/components/reusable/app-select-component/app-select-component', () => ({
  AppSelectComponent: ({
    options,
    value,
    onChange,
    disabled,
    ariaLabel,
  }: {
    options: { label: string; value: string }[]
    value: { label: string; value: string }[]
    onChange: (value: { label: string; value: string }[]) => void
    disabled: boolean
    ariaLabel: string
  }) => (
    <select
      aria-label={ariaLabel}
      multiple
      disabled={disabled}
      value={value.map((item) => item.value)}
      onChange={(event) =>
        onChange(
          options.filter((item) =>
            [...event.target.selectedOptions].some((option) => option.value === item.value),
          ),
        )
      }
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}))

import { MapMetadataDialog } from '@/routes/_authenticated/operations/components/maps/detail/-map-metadata-dialog'

const tag = { id: '00000000-0000-4000-8000-000000000001', name: 'Warehouse' }
const map: IMapDetailInfo = {
  id: '00000000-0000-4000-8000-000000000011',
  name: 'Warehouse map',
  description: 'Original description',
  status: 'UNASSIGNED',
  dimension_x: 20,
  dimension_y: 10,
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
  tags: [tag],
  robots: [],
  boundary: null,
  zones: [],
  docking_stations: [],
}

async function openEditor() {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Edit Metadata' }))
  return user
}
const save = () => within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' })

describe('MapMetadataDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mutateAsync.mockResolvedValue(undefined)
    mocks.useTagsQuery.mockReturnValue({ data: { data: [tag] }, isLoading: false, isError: false })
  })

  it('defaults from map detail and gates unchanged or reverted values', async () => {
    render(<MapMetadataDialog map={map} />)
    const user = await openEditor()
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue(map.name)
    expect(screen.getByLabelText('Description')).toHaveValue(map.description)
    expect(screen.getByLabelText('Tags')).toHaveValue([tag.id])
    expect(save()).toBeDisabled()
    await user.type(screen.getByRole('textbox', { name: 'Name' }), ' edited')
    await waitFor(() => expect(save()).toBeEnabled())
    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: map.name } })
    await waitFor(() => expect(save()).toBeDisabled())
  })

  it.each(['loading', 'error'])(
    'retains selections when tags are %s and accepts null description',
    async (state) => {
      mocks.useTagsQuery.mockReturnValue({
        isError: state === 'error',
        isLoading: state === 'loading',
      })
      render(<MapMetadataDialog map={{ ...map, description: null }} />)
      await openEditor()
      expect(screen.getByLabelText('Description')).toHaveValue('')
      expect(screen.getByLabelText('Tags')).toHaveValue([tag.id])
      expect(screen.getByLabelText('Tags')).toBeDisabled()
      if (state === 'error')
        expect(screen.getByRole('alert')).toHaveTextContent('Current selections are preserved')
    },
  )

  it.each([
    ['Name', '', 'Map name is required'],
    ['Name', '   ', 'Map name is required'],
    ['Name', 'x'.repeat(51), 'Name must be at most 50 characters'],
    ['Description', 'x'.repeat(251), 'Description must be at most 250 characters'],
  ])('rejects invalid %s input', async (label, value, message) => {
    render(<MapMetadataDialog map={map} />)
    await openEditor()
    fireEvent.change(screen.getByRole('textbox', { name: label }), { target: { value } })
    expect(await screen.findByText(message)).toBeVisible()
    expect(save()).toBeDisabled()
    expect(mocks.mutateAsync).not.toHaveBeenCalled()
  })

  it.each(['Cancel', 'Close', 'Escape'])(
    'discards edits on %s and reloads latest defaults',
    async (action) => {
      const view = render(<MapMetadataDialog map={map} />)
      const user = await openEditor()
      await user.type(screen.getByRole('textbox', { name: 'Name' }), ' edited')
      if (action === 'Escape') await user.keyboard('{Escape}')
      else await user.click(screen.getByRole('button', { name: action }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      view.rerender(<MapMetadataDialog map={{ ...map, name: 'Latest map' }} />)
      await openEditor()
      expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Latest map')
      expect(save()).toBeDisabled()
    },
  )

  it('submits trimmed name and explicit empty description/tags, then closes', async () => {
    render(<MapMetadataDialog map={map} />)
    const user = await openEditor()
    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), {
      target: { value: ' Updated map ' },
    })
    await user.clear(screen.getByLabelText('Description'))
    await user.deselectOptions(screen.getByLabelText('Tags'), tag.id)
    await waitFor(() => expect(save()).toBeEnabled())
    await user.click(save())
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(mocks.mutateAsync).toHaveBeenCalledWith({
      map_id: map.id,
      name: 'Updated map',
      description: '',
      tags: [],
    })
    expect(mocks.toast.success).toHaveBeenCalled()
  })

  it('does not overwrite edits on background refetch', async () => {
    const view = render(<MapMetadataDialog map={map} />)
    const user = await openEditor()
    await user.type(screen.getByRole('textbox', { name: 'Name' }), ' edited')
    view.rerender(<MapMetadataDialog map={{ ...map, name: 'Background update' }} />)
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue(`${map.name} edited`)
  })

  it('blocks dismissal and duplicate submissions while saving', async () => {
    let finish: (() => void) | undefined
    mocks.mutateAsync.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        }),
    )
    render(<MapMetadataDialog map={map} />)
    const user = await openEditor()
    await user.type(screen.getByRole('textbox', { name: 'Name' }), ' edited')
    await waitFor(() => expect(save()).toBeEnabled())
    await user.click(save())
    expect(save()).toBeDisabled()
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toBeVisible()
    fireEvent.submit(
      screen.getByRole('textbox', { name: 'Name' }).closest('form') as HTMLFormElement,
    )
    expect(mocks.mutateAsync).toHaveBeenCalledTimes(1)
    finish?.()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('preserves edits after failure and allows retry', async () => {
    mocks.mutateAsync.mockRejectedValueOnce(new Error('Offline'))
    render(<MapMetadataDialog map={map} />)
    const user = await openEditor()
    await user.type(screen.getByRole('textbox', { name: 'Name' }), ' edited')
    await waitFor(() => expect(save()).toBeEnabled())
    await user.click(save())
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalled())
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue(`${map.name} edited`)
    await waitFor(() => expect(save()).toBeEnabled())
    await user.click(save())
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('shows duplicate-name errors on Name and recovers when edited', async () => {
    const error = new AxiosError('Duplicate', '400', undefined, undefined, { status: 400 } as never)
    mocks.mutateAsync.mockRejectedValueOnce(error)
    render(<MapMetadataDialog map={map} />)
    const user = await openEditor()
    await user.type(screen.getByRole('textbox', { name: 'Name' }), ' edited')
    await waitFor(() => expect(save()).toBeEnabled())
    await user.click(save())
    expect(
      await screen.findByText('A map with this name already exists in the active group'),
    ).toBeVisible()
    expect(save()).toBeDisabled()
    await user.type(screen.getByRole('textbox', { name: 'Name' }), ' again')
    await waitFor(() => expect(save()).toBeEnabled())
  })
})
