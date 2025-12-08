export type ToastType = 'error' | 'info' | 'success'

export interface ToastData {
  id: string
  message: string
  type: ToastType
}

export interface ShowToastOptions {
  message: string
  type: ToastType
  duration?: number
}

export interface UseToastReturn {
  toasts: ToastData[]
  showToast: (options: ShowToastOptions) => void
  dismissToast: (id: string) => void
}

export interface ToastProps {
  toast: ToastData
  onDismiss: (id: string) => void
}
