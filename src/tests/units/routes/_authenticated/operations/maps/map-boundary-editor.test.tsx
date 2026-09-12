import { fireEvent, render, screen } from '@testing-library/react'
import type { MouseEventHandler, ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GeometryType, MapZoneType } from '@/enum/maps'

const useMapBoundaryEditor = vi.hoisted(() => vi.fn())
const handlers = vi.hoisted(() => ({
  handleEndpointMouseDown: vi.fn(),
  handleStageClick: vi.fn(),
  handleStageMouseMove: vi.fn(),
  handleStageMouseUp: vi.fn(),
  handleVertexClick: vi.fn(),
  handleVertexDragEnd: vi.fn(),
  handleZoomIn: vi.fn(),
  handleZoomOut: vi.fn(),
}))

vi.mock('@/routes/_authenticated/operations/components/maps/-use-map-boundary-editor', () => ({
  useMapBoundaryEditor,
}))
vi.mock('@/routes/_authenticated/operations/components/maps/-map-grid-preview', () => ({
  MAP_CANVAS_PADDING: 20,
  MapGridLayer: () => <div data-testid="map-grid-layer" />,
}))
vi.mock('react-konva', () => ({
  Circle: ({
    draggable,
    onClick,
    onDragEnd,
    onMouseDown,
  }: {
    draggable: boolean
    onClick?: (event: string) => void
    onDragEnd?: (event: string) => void
    onMouseDown?: (event: string) => void
  }) => (
    <button
      data-draggable={draggable}
      data-testid="boundary-vertex"
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onClick?.('vertex-click')
      }}
      onDragEnd={() => onDragEnd?.('vertex-drag-end')}
      onMouseDown={() => onMouseDown?.('endpoint-mouse-down')}
    />
  ),
  Layer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Line: ({
    closed,
    dash,
    fill,
    listening,
    name,
    onClick,
    points,
    stroke,
    strokeWidth,
  }: {
    closed?: boolean
    dash?: number[]
    fill?: string
    listening?: boolean
    name?: string
    onClick?: (event: { cancelBubble: boolean }) => void
    points: number[]
    stroke?: string
    strokeWidth?: number
  }) => (
    <button
      aria-label={name ?? 'polygon line'}
      data-closed={closed}
      data-dash={JSON.stringify(dash)}
      data-fill={fill}
      data-listening={listening}
      data-name={name}
      data-points={JSON.stringify(points)}
      data-stroke={stroke}
      data-stroke-width={strokeWidth}
      data-testid="boundary-line"
      type="button"
      onClick={() => onClick?.({ cancelBubble: false })}
    />
  ),
  Stage: ({
    children,
    onClick,
    onMouseMove,
    onMouseUp,
  }: {
    children: ReactNode
    onClick?: MouseEventHandler<HTMLElement>
    onMouseMove?: MouseEventHandler<HTMLElement>
    onMouseUp?: MouseEventHandler<HTMLElement>
  }) => (
    <section
      data-testid="boundary-stage"
      role="application"
      onClick={onClick}
      onKeyDown={() => undefined}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    >
      {children}
    </section>
  ),
}))

import { MapBoundaryEditor } from '@/routes/_authenticated/operations/components/maps/-map-boundary-editor'

const defaultProps = {
  dimensionX: 20,
  dimensionY: 12,
  points: [
    [1, 1],
    [8, 1],
  ] as [number, number][],
  closed: false,
  interactive: true,
  onChange: vi.fn(),
  onInvalid: vi.fn(),
}

const editorState = {
  canvasPoints: [
    { x: 10, y: 110 },
    { x: 80, y: 110 },
  ],
  canZoomIn: true,
  canZoomOut: true,
  extension: undefined,
  geometry: { stageHeight: 160, stageWidth: 240 },
  ...handlers,
  scale: 1,
}

describe('MapBoundaryEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useMapBoundaryEditor.mockReturnValue(editorState)
  })

  it('renders nothing when map geometry is unavailable', () => {
    useMapBoundaryEditor.mockReturnValue({ ...editorState, geometry: undefined })

    const { container } = render(<MapBoundaryEditor {...defaultProps} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders boundary and extension lines from hook canvas state', () => {
    useMapBoundaryEditor.mockReturnValue({
      ...editorState,
      extension: { start: { x: 80, y: 110 }, preview: { x: 120, y: 60 } },
    })

    render(<MapBoundaryEditor {...defaultProps} />)

    const lines = screen.getAllByTestId('boundary-line')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toHaveAttribute('data-closed', 'false')
    expect(lines[0]).toHaveAttribute('data-points', '[10,110,80,110]')
    expect(lines[1]).toHaveAttribute('data-points', '[80,110,120,60]')
  })

  it('fills a closed polygon and makes every vertex draggable', () => {
    render(<MapBoundaryEditor {...defaultProps} closed />)

    expect(screen.getByTestId('boundary-line')).toHaveAttribute('data-fill', 'transparent')
    for (const vertex of screen.getAllByTestId('boundary-vertex')) {
      expect(vertex).toHaveAttribute('data-draggable', 'true')
    }
  })

  it('renders persisted boundary points when requested by a read-only view', () => {
    useMapBoundaryEditor.mockReturnValue({ ...editorState, canvasPoints: [] })

    render(
      <MapBoundaryEditor
        {...defaultProps}
        boundaryClosed
        boundaryPoints={[
          [0, 0],
          [20, 0],
          [20, 12],
          [0, 12],
        ]}
        interactive={false}
        points={[]}
        showBoundary
      />,
    )

    expect(screen.getByTestId('boundary-line')).toHaveAttribute('data-closed', 'true')
  })

  it('forwards dragging a preloaded closed polygon vertex', () => {
    render(
      <MapBoundaryEditor
        {...defaultProps}
        closed
        points={[
          [2, 2],
          [10, 2],
          [6, 8],
        ]}
      />,
    )
    fireEvent.dragEnd(screen.getAllByTestId('boundary-vertex')[0])
    expect(handlers.handleVertexDragEnd).toHaveBeenCalledWith(0, 'vertex-drag-end')
  })

  it('wires stage, vertex, endpoint, and zoom interactions', () => {
    render(<MapBoundaryEditor {...defaultProps} />)

    const stage = screen.getByTestId('boundary-stage')
    fireEvent.click(stage)
    fireEvent.mouseMove(stage)
    fireEvent.mouseUp(stage)

    const vertices = screen.getAllByTestId('boundary-vertex')
    expect(vertices[0]).toHaveAttribute('data-draggable', 'true')
    expect(vertices[1]).toHaveAttribute('data-draggable', 'false')
    fireEvent.click(vertices[0])
    fireEvent.dragEnd(vertices[0])
    fireEvent.mouseDown(vertices[1])
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }))

    expect(handlers.handleStageClick).toHaveBeenCalledOnce()
    expect(handlers.handleStageMouseMove).toHaveBeenCalledOnce()
    expect(handlers.handleStageMouseUp).toHaveBeenCalledOnce()
    expect(handlers.handleVertexClick).toHaveBeenCalledWith(0, 'vertex-click')
    expect(handlers.handleVertexDragEnd).toHaveBeenCalledWith(0, 'vertex-drag-end')
    expect(handlers.handleEndpointMouseDown).toHaveBeenCalledWith('endpoint-mouse-down')
    expect(handlers.handleZoomIn).toHaveBeenCalledOnce()
    expect(handlers.handleZoomOut).toHaveBeenCalledOnce()
  })

  it('shows the current scale and disables zoom controls at their limits', () => {
    useMapBoundaryEditor.mockReturnValue({
      ...editorState,
      canZoomIn: false,
      canZoomOut: false,
      scale: 3,
    })

    render(<MapBoundaryEditor {...defaultProps} />)

    expect(screen.getByText('3.0×')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeDisabled()
  })

  it('renders selectable completed zones and inactive drafts with their configured styles', () => {
    const onSelectZone = vi.fn()
    render(
      <MapBoundaryEditor
        {...defaultProps}
        activeZoneType={MapZoneType.OBSTACLE}
        boundaryClosed
        boundaryPoints={[
          [0, 0],
          [20, 0],
          [20, 12],
          [0, 12],
        ]}
        drafts={{
          OBSTACLE: { points: [] },
          NO_GO: {
            points: [
              [3, 3],
              [4, 3],
            ],
          },
          CLEANING_ZONE: { points: [] },
        }}
        selectionMode
        zones={[
          {
            clientId: 'zone-1',
            zoneType: MapZoneType.NO_GO,
            geometry: {
              type: GeometryType.POLYGON,
              coordinates: [
                [
                  [2, 2],
                  [5, 2],
                  [3, 5],
                  [2, 2],
                ],
              ],
            },
          },
        ]}
        onSelectZone={onSelectZone}
      />,
    )

    const zone = screen.getByRole('button', { name: 'map-zone-NO_GO' })
    expect(zone).toHaveAttribute('data-stroke', '#EF4444')
    expect(zone).toHaveAttribute('data-fill', 'rgba(239, 68, 68, 0.16)')
    expect(zone).toHaveAttribute('data-dash', '[8,6]')
    expect(zone).toHaveAttribute('data-listening', 'true')
    fireEvent.click(zone)
    expect(onSelectZone).toHaveBeenCalledWith('zone-1')

    expect(
      screen
        .getAllByTestId('boundary-line')
        .some((line) => line.getAttribute('data-dash') === '[8,6]'),
    ).toBe(true)
  })
})
