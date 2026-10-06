import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useEditHistory } from '@/routes/_authenticated/operations/components/maps/map-preview-editor/hooks/-use-edit-history'

describe('useEditHistory', () => {
  it('records distinct edits, undoes one step, and resets to its baseline', () => {
    const { result } = renderHook(() => useEditHistory({ points: [1] }))
    act(() => result.current.change({ points: [1, 2] }))
    act(() => result.current.change({ points: [1, 2] }))
    expect(result.current.canUndo).toBe(true)
    act(() => result.current.undo())
    expect(result.current.value).toEqual({ points: [1] })
    expect(result.current.canUndo).toBe(false)
    act(() => result.current.change({ points: [3] }))
    act(() => result.current.clear())
    expect(result.current.value).toEqual({ points: [1] })
  })

  it('commits the current value as the new baseline', () => {
    const { result } = renderHook(() => useEditHistory({ count: 0 }))
    act(() => result.current.change({ count: 1 }))
    act(() => result.current.commit())
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canClear).toBe(false)
    act(() => result.current.change({ count: 2 }))
    act(() => result.current.clear())
    expect(result.current.value).toEqual({ count: 1 })
  })
})
