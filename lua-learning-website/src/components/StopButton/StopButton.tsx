import styles from './StopButton.module.css'

export interface StopButtonProps {
  /** Called when the stop button is clicked */
  onStop: () => void
  /** Whether the button is disabled */
  disabled?: boolean
  /** Additional CSS class */
  className?: string
}

/**
 * Stop button for interrupting running processes.
 * Displays a stop icon (square) and calls onStop when clicked.
 */
export function StopButton({ onStop, disabled = false, className }: StopButtonProps) {
  const buttonClassName = className
    ? `${styles.stopButton} ${className}`
    : styles.stopButton

  return (
    <button
      type="button"
      className={buttonClassName}
      onClick={onStop}
      disabled={disabled}
      aria-label="Stop process"
      title="Stop process (Ctrl+C)"
    >
      <span className={styles.stopIcon} aria-hidden="true" />
    </button>
  )
}
