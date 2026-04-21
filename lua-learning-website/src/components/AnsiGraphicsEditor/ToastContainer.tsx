import type { Toast } from './useToast'
import styles from './AnsiGraphicsEditor.module.css'

export interface ToastContainerProps {
  toasts: Toast[]
  /** Dismiss a toast by id when the user clicks it. Optional — if omitted, toasts auto-dismiss only. */
  onDismiss?: (id: number) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null
  return (
    <div className={styles.toastContainer}>
      {toasts.map(t => (
        <div
          key={t.id}
          className={styles.toast}
          onClick={onDismiss ? () => onDismiss(t.id) : undefined}
          title={onDismiss ? 'Click to dismiss' : undefined}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
