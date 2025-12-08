import { useState, useCallback, useRef, useEffect } from 'react'

const STORAGE_PREFIX = 'ide-panel:'
const DEBOUNCE_DELAY = 100

export interface UsePanelPersistenceOptions {
  /** localStorage key for persistence */
  persistId?: string
}

export interface UsePanelPersistenceReturn {
  /** Currently saved layout (null if none or invalid) */
  savedLayout: number[] | null
  /** Save layout to localStorage (debounced) */
  saveLayout: (sizes: number[]) => void
  /** Clear saved layout */
  reset: () => void
}

function getStorageKey(persistId: string): string {
  return `${STORAGE_PREFIX}${persistId}`
}

function loadFromStorage(persistId: string): number[] | null {
  try {
    const key = getStorageKey(persistId)
    const stored = localStorage.getItem(key)
    if (!stored) return null

    const parsed = JSON.parse(stored)

    // Validate that it's an array of numbers
    if (!Array.isArray(parsed)) return null
    if (!parsed.every((item) => typeof item === 'number')) return null

    return parsed
  } catch {
    // Invalid JSON or other error
    return null
  }
}

export function usePanelPersistence(
  options: UsePanelPersistenceOptions = {}
): UsePanelPersistenceReturn {
  const { persistId } = options
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [savedLayout, setSavedLayout] = useState<number[] | null>(() => {
    if (!persistId) return null
    return loadFromStorage(persistId)
  })

  // Cleanup timeout on unmount
  // Stryker disable next-line BlockStatement: Cleanup function prevents memory leaks - not observable in unit tests
  useEffect(() => {
    return () => {
      // Stryker disable next-line BlockStatement,ConditionalExpression: Cleanup logic - memory leak prevention not testable
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
    // Stryker disable next-line ArrayDeclaration: Empty dependency array is intentional - cleanup runs once on unmount
  }, [])

  const saveLayout = useCallback(
    (sizes: number[]) => {
      if (!persistId) return

      // Clear any pending save
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Debounce the save
      timeoutRef.current = setTimeout(() => {
        const key = getStorageKey(persistId)
        localStorage.setItem(key, JSON.stringify(sizes))
        setSavedLayout(sizes)
      }, DEBOUNCE_DELAY)
    },
    // Stryker disable next-line ArrayDeclaration: React dependency array - tests verify behavior, not re-render optimization
    [persistId]
  )

  const reset = useCallback(() => {
    if (!persistId) return

    // Clear any pending save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    const key = getStorageKey(persistId)
    localStorage.removeItem(key)
    setSavedLayout(null)
    // Stryker disable next-line ArrayDeclaration: React dependency array - tests verify behavior, not re-render optimization
  }, [persistId])

  return {
    savedLayout,
    saveLayout,
    reset,
  }
}
