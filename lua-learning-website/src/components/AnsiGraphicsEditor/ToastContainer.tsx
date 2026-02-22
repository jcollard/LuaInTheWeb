import type { Toast } from './useToast'
import styles from './AnsiGraphicsEditor.module.css'

export interface ToastContainerProps {
  toasts: Toast[]
}

export function ToastContainer({ toasts }: ToastContainerProps) {
  if (toasts.length === 0) return null
  return (
    <div className={styles.toastContainer}>
      {toasts.map(t => (
        <div key={t.id} className={styles.toast}>{t.message}</div>
      ))}
    </div>
  )
}
