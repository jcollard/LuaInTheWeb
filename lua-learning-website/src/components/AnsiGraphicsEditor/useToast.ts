import { useCallback, useRef, useState } from 'react'

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

  const showToast = useCallback((message: string) => {
    const id = nextId.current++
    setToasts(prev => [...prev.slice(-(MAX_TOASTS - 1)), { id, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), TOAST_DURATION_MS)
  }, [])

  return { toasts, showToast }
}
