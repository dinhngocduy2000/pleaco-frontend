import { act, render, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useDebounce } from '@/hooks/use-debounce'
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll'
import { useIsMobile } from '@/hooks/use-mobile'

describe('shared hooks', () => {
  afterEach(() => vi.useRealTimers())

  it('debounces changed values', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 200), {
      initialProps: { value: 'first' },
    })
    rerender({ value: 'second' })
    expect(result.current).toBe('first')
    act(() => vi.advanceTimersByTime(200))
    expect(result.current).toBe('second')
  })

  it('reports the current media breakpoint and responds to changes', () => {
    const listeners = new Set<() => void>()
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        addEventListener: (_: string, fn: () => void) => listeners.add(fn),
        removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
      })),
    )
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 700 })
    const { result } = renderHook(useIsMobile)
    expect(result.current).toBe(true)
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 900 })
    act(() => {
      listeners.forEach((listener) => {
        listener()
      })
    })
    expect(result.current).toBe(false)
    vi.unstubAllGlobals()
  })

  it('advances only when its loader intersects and more data is available', () => {
    let callback: IntersectionObserverCallback | undefined
    const observe = vi.fn()
    const disconnect = vi.fn()
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: IntersectionObserverCallback) {
          callback = cb
        }
        observe = observe
        disconnect = disconnect
        unobserve = vi.fn()
        takeRecords = vi.fn(() => [])
      } as never,
    )
    const onPageChange = vi.fn()
    function Loader() {
      const { loaderRef } = useInfiniteScroll({
        hasMore: true,
        isFetchingData: false,
        onPageChange,
      })
      return <div ref={loaderRef} />
    }
    const { unmount } = render(<Loader />)
    act(() =>
      callback?.(
        [{ isIntersecting: true }] as IntersectionObserverEntry[],
        {} as IntersectionObserver,
      ),
    )
    expect(observe).toHaveBeenCalledOnce()
    expect(onPageChange).toHaveBeenCalledOnce()
    unmount()
    expect(disconnect).toHaveBeenCalledOnce()
    vi.unstubAllGlobals()
  })
})
