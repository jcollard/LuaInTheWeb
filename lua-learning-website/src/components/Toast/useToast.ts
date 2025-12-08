import { useState, useCallback, useRef, useEffect } from 'react'
import type { ToastData, ShowToastOptions, UseToastReturn } from './types'

const DEFAULT_DURATION = 5000

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<ToastData[]>([])
  const nextIdRef = useRef(1)
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      for (const timer of timersRef.current.values()) {
        clearTimeout(timer)
      }
    }
  }, [])

  const dismissToast = useCallback((id: string) => {
    // Clear the timer if it exists
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }

    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (options: ShowToastOptions) => {
      const id = `toast-${nextIdRef.current++}`
      const duration = options.duration ?? DEFAULT_DURATION

      const newToast: ToastData = {
        id,
        message: options.message,
        type: options.type,
      }

      setToasts((prev) => [...prev, newToast])

      // Set up auto-dismiss timer
      const timer = setTimeout(() => {
        dismissToast(id)
      }, duration)
      timersRef.current.set(id, timer)
    },
    [dismissToast]
  )

  return {
    toasts,
    showToast,
    dismissToast,
  }
}
