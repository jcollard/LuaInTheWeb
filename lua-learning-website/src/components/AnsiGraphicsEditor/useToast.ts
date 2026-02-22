import { useCallback, useEffect, useRef, useState } from 'react'

export interface Toast {
  id: number
  message: string
}

export const TOAST_DURATION_MS = 1500
export const MAX_TOASTS = 3

export interface UseToastReturn {
  toasts: Toast[]
  showToast: (message: string) => void
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

  const showToast = useCallback((message: string) => {
    const id = nextId.current++
    setToasts(prev => [...prev.slice(-(MAX_TOASTS - 1)), { id, message }])
    const timer = setTimeout(() => {
      timersRef.current.delete(id)
      setToasts(prev => prev.filter(t => t.id !== id))
    }, TOAST_DURATION_MS)
    timersRef.current.set(id, timer)
  }, [])

  return { toasts, showToast }
}
