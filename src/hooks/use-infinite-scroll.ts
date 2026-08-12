import { useEffect, useRef } from 'react'

type Props = {
  onPageChange: VoidFunction
  hasMore: boolean
  isFetchingData: boolean
  dependencyKeys?: unknown[]
  root?: Element | null
}
export const useInfiniteScroll = ({
  onPageChange,
  hasMore,
  isFetchingData,
  dependencyKeys = [],
  root = null,
}: Props) => {
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loaderRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!loaderRef.current) return
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetchingData) {
          onPageChange()
        }
      },
      { root, rootMargin: '0px', threshold: 1.0 },
    )

    observerRef.current.observe(loaderRef.current)

    return () => {
      observerRef.current?.disconnect()
    }
  }, [...dependencyKeys, hasMore, isFetchingData, onPageChange, root])

  return { loaderRef }
}
