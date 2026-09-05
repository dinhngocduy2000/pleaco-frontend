import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { IMapBoundaryCoordinate } from '@/interface/maps'
import { useMapBoundaryEditor } from '@/routes/_authenticated/operations/components/maps/-use-map-boundary-editor'

const createKonvaEvent = (
  pointer: { x: number; y: number },
  nodePosition: { x: number; y: number } = pointer,
) => {
  const stage = { getPointerPosition: () => pointer }
  return {
    cancelBubble: false,
    target: {
      getStage: () => stage,
      x: () => nodePosition.x,
      y: () => nodePosition.y,
    },
  }
}

const defaultParams = {
  dimensionX: 10,
  dimensionY: 10,
  points: [] as IMapBoundaryCoordinate[],
  closed: false,
  interactive: true,
  onChange: vi.fn(),
  onInvalid: vi.fn(),
}

describe('useMapBoundaryEditor', () => {
  it('converts a stage click into an in-bounds world coordinate', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useMapBoundaryEditor({ ...defaultParams, onChange }))

    act(() => result.current.handleStageClick(createKonvaEvent({ x: 40, y: 100 }) as never))

    expect(onChange).toHaveBeenCalledWith([[2, 2]], false)
  })

  it('ignores drawing events when the editor is not interactive', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() =>
      useMapBoundaryEditor({ ...defaultParams, interactive: false, onChange }),
    )

    act(() => result.current.handleStageClick(createKonvaEvent({ x: 40, y: 100 }) as never))

    expect(onChange).not.toHaveBeenCalled()
  })

  it('creates a new point by dragging from the active endpoint and suppresses its click', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() =>
      useMapBoundaryEditor({ ...defaultParams, points: [[2, 2]], onChange }),
    )
    const startEvent = createKonvaEvent({ x: 40, y: 100 })
    const endEvent = createKonvaEvent({ x: 100, y: 100 })

    act(() => result.current.handleEndpointMouseDown(startEvent as never))
    expect(result.current.extension).toBeDefined()
    act(() => result.current.handleStageMouseMove(endEvent as never))
    expect(result.current.extension?.preview).toEqual({ x: 80, y: 80 })
    act(() => result.current.handleStageMouseUp(endEvent as never))

    expect(onChange).toHaveBeenCalledWith(
      [
        [2, 2],
        [8, 2],
      ],
      false,
    )
    act(() => result.current.handleStageClick(endEvent as never))
    expect(onChange).toHaveBeenCalledOnce()
  })

  it('closes a valid polygon by selecting its first vertex', () => {
    const onChange = vi.fn()
    const points: IMapBoundaryCoordinate[] = [
      [1, 1],
      [8, 1],
      [4, 8],
    ]
    const { result } = renderHook(() =>
      useMapBoundaryEditor({ ...defaultParams, points, onChange }),
    )
    const event = createKonvaEvent({ x: 30, y: 110 })

    act(() => result.current.handleVertexClick(0, event as never))

    expect(event.cancelBubble).toBe(true)
    expect(onChange).toHaveBeenCalledWith(points, true)
  })

  it('commits valid vertex movement and rejects an invalid duplicate', () => {
    const onChange = vi.fn()
    const onInvalid = vi.fn()
    const points: IMapBoundaryCoordinate[] = [
      [1, 1],
      [8, 1],
      [4, 8],
    ]
    const { result } = renderHook(() =>
      useMapBoundaryEditor({ ...defaultParams, points, closed: true, onChange, onInvalid }),
    )

    act(() =>
      result.current.handleVertexDragEnd(
        2,
        createKonvaEvent({ x: 0, y: 0 }, { x: 50, y: 10 }) as never,
      ),
    )
    expect(onChange).toHaveBeenCalledWith(
      [
        [1, 1],
        [8, 1],
        [5, 9],
      ],
      true,
    )

    act(() =>
      result.current.handleVertexDragEnd(
        2,
        createKonvaEvent({ x: 0, y: 0 }, { x: 10, y: 90 }) as never,
      ),
    )
    expect(onInvalid).toHaveBeenCalledOnce()
  })

  it('enforces the zoom limits', () => {
    const { result } = renderHook(() => useMapBoundaryEditor(defaultParams))

    act(() => {
      for (let step = 0; step < 10; step += 1) result.current.handleZoomIn()
    })
    expect(result.current.scale).toBe(3)
    expect(result.current.canZoomIn).toBe(false)

    act(() => {
      for (let step = 0; step < 10; step += 1) result.current.handleZoomOut()
    })
    expect(result.current.scale).toBe(0.5)
    expect(result.current.canZoomOut).toBe(false)
  })
})
