import { useState, useCallback } from 'react'

const SCROLL_AMOUNT = 150

export interface UseTabBarScrollReturn {
  canScrollLeft: boolean
  canScrollRight: boolean
  hasOverflow: boolean
  scrollLeft: () => void
  scrollRight: () => void
  handleScroll: () => void
  checkOverflow: () => void
  setContainerRef: (element: HTMLDivElement | null) => void
}

export function useTabBarScroll(): UseTabBarScrollReturn {
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [hasOverflow, setHasOverflow] = useState(false)

  const updateScrollState = useCallback((element: HTMLDivElement | null) => {
    if (!element) {
      setCanScrollLeft(false)
      setCanScrollRight(false)
      setHasOverflow(false)
      return
    }

    const { scrollLeft, scrollWidth, clientWidth } = element
    const maxScroll = scrollWidth - clientWidth

    setHasOverflow(scrollWidth > clientWidth)
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft < maxScroll)
  }, [])

  const setContainerRef = useCallback(
    (element: HTMLDivElement | null) => {
      setContainer(element)
      updateScrollState(element)
    },
    [updateScrollState]
  )

  const handleScroll = useCallback(() => {
    updateScrollState(container)
  }, [container, updateScrollState])

  const checkOverflow = useCallback(() => {
    updateScrollState(container)
  }, [container, updateScrollState])

  const scrollLeft = useCallback(() => {
    if (!container) return

    const newScrollLeft = Math.max(0, container.scrollLeft - SCROLL_AMOUNT)
    container.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth',
    })
  }, [container])

  const scrollRight = useCallback(() => {
    if (!container) return

    const maxScroll = container.scrollWidth - container.clientWidth
    const newScrollLeft = Math.min(maxScroll, container.scrollLeft + SCROLL_AMOUNT)
    container.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth',
    })
  }, [container])

  return {
    canScrollLeft,
    canScrollRight,
    hasOverflow,
    scrollLeft,
    scrollRight,
    handleScroll,
    checkOverflow,
    setContainerRef,
  }
}
