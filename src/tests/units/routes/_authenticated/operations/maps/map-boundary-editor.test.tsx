import { fireEvent, render, screen } from '@testing-library/react'
import type { MouseEventHandler, ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
  Line: ({ closed, fill, points }: { closed?: boolean; fill?: string; points: number[] }) => (
    <div
      data-closed={closed}
      data-fill={fill}
      data-points={JSON.stringify(points)}
      data-testid="boundary-line"
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

    expect(screen.getByTestId('boundary-line')).toHaveAttribute(
      'data-fill',
      'rgb(97 95 255 / 0.12)',
    )
    for (const vertex of screen.getAllByTestId('boundary-vertex')) {
      expect(vertex).toHaveAttribute('data-draggable', 'true')
    }
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
})
