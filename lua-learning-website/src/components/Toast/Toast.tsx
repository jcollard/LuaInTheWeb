import type { ToastProps } from './types'
import styles from './Toast.module.css'

export function Toast({ toast, onDismiss }: ToastProps) {
  return (
    <div
      role="alert"
      className={`${styles.toast} ${styles[toast.type]}`}
    >
      <span className={styles.message}>{toast.message}</span>
      <button
        className={styles.closeButton}
        onClick={() => onDismiss(toast.id)}
        aria-label="Close"
      >
        ×
      </button>
    </div>
  )
}
