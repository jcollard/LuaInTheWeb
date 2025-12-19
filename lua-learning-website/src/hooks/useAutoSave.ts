import { useState, useCallback, useRef, useEffect } from 'react'

const STORAGE_KEY = 'ide-auto-save-enabled'
const DEFAULT_DELAY = 1500

export interface UseAutoSaveOptions {
  /** Callback to invoke when auto-save triggers */
  onAutoSave: () => void
  /** Debounce delay in milliseconds (default: 1500ms) */
  delay?: number
}

export interface UseAutoSaveReturn {
  /** Whether auto-save is currently enabled */
  autoSaveEnabled: boolean
  /** Toggle auto-save on/off */
  toggleAutoSave: () => void
  /** Notify that content has changed (triggers debounced save if enabled) */
  notifyChange: () => void
}

/**
 * Hook for auto-save functionality with debouncing and localStorage persistence
 */
export function useAutoSave({
  onAutoSave,
  delay = DEFAULT_DELAY,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  // Load initial state from localStorage
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'true'
  })

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onAutoSaveRef = useRef(onAutoSave)

  // Keep ref up to date
  useEffect(() => {
    onAutoSaveRef.current = onAutoSave
  }, [onAutoSave])

  // Cancel pending save when auto-save is disabled
  useEffect(() => {
    if (!autoSaveEnabled && timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [autoSaveEnabled])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const toggleAutoSave = useCallback(() => {
    setAutoSaveEnabled((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }, [])

  const notifyChange = useCallback(() => {
    if (!autoSaveEnabled) return

    // Clear any existing timeout (debounce)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      onAutoSaveRef.current()
      timeoutRef.current = null
    }, delay)
  }, [autoSaveEnabled, delay])

  return {
    autoSaveEnabled,
    toggleAutoSave,
    notifyChange,
  }
}
