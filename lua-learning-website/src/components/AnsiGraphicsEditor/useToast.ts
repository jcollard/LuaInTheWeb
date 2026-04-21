import { useCallback, useEffect, useRef, useState } from 'react'

export interface Toast {
  id: number
  message: string
}

export const TOAST_DURATION_MS = 1500
export const MAX_TOASTS = 3

export interface UseToastReturn {
  toasts: Toast[]
  /** Show a toast. Optional durationMs overrides TOAST_DURATION_MS for this toast. */
  showToast: (message: string, durationMs?: number) => void
  /** Remove a specific toast immediately (e.g. on click). */
  dismissToast: (id: number) => void
}

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer)
      }
      timers.clear()
    }
  }, [])

  const showToast = useCallback((message: string, durationMs?: number) => {
    const id = nextId.current++
    setToasts(prev => [...prev.slice(-(MAX_TOASTS - 1)), { id, message }])
    const timer = setTimeout(() => {
      timersRef.current.delete(id)
      setToasts(prev => prev.filter(t => t.id !== id))
    }, durationMs ?? TOAST_DURATION_MS)
    timersRef.current.set(id, timer)
  }, [])

  const dismissToast = useCallback((id: number) => {
    const timer = timersRef.current.get(id)
    if (timer !== undefined) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, showToast, dismissToast }
}
