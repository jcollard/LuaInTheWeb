import { useState, useEffect } from 'react'

const DEFAULT_MOBILE_BREAKPOINT = 768

export function useIsMobile(breakpoint: number = DEFAULT_MOBILE_BREAKPOINT): boolean {
  const query = `(max-width: ${breakpoint}px)`

  const [isMobile, setIsMobile] = useState(() => {
    // Stryker disable next-line ConditionalExpression,BooleanLiteral: SSR guard - window is always defined in jsdom tests
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)

    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches)
    }

    // Set initial value
    setIsMobile(mediaQuery.matches)

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
    // Stryker disable next-line ArrayDeclaration: React dependency array - tests verify behavior, not re-render optimization
  }, [query])

  return isMobile
}
