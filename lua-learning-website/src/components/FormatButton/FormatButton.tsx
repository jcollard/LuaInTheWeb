import styles from './FormatButton.module.css'

export interface FormatButtonProps {
  /** Called when the format button is clicked */
  onFormat: () => void
  /** Whether the button is disabled */
  disabled?: boolean
  /** Whether formatting is in progress */
  loading?: boolean
  /** Additional CSS class */
  className?: string
}

/**
 * Format button for formatting Lua code.
 * Displays a format icon and calls onFormat when clicked.
 */
export function FormatButton({
  onFormat,
  disabled = false,
  loading = false,
  className,
}: FormatButtonProps) {
  const isDisabled = disabled || loading
  const buttonClassName = className
    ? `${styles.formatButton} ${className}`
    : styles.formatButton

  const label = loading ? 'Formatting...' : 'Format code'

  return (
    <button
      type="button"
      className={buttonClassName}
      onClick={onFormat}
      disabled={isDisabled}
      aria-label={label}
      title="Format code (Shift+Alt+F)"
    >
      {loading ? (
        <span className={styles.spinner} aria-hidden="true" />
      ) : (
        <svg
          className={styles.icon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {/* Format/align icon */}
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="16" y2="12" />
          <line x1="4" y1="18" x2="12" y2="18" />
        </svg>
      )}
    </button>
  )
}
