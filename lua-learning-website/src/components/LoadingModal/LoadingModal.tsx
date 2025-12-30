import { useId, useEffect, useCallback } from 'react'
import styles from './LoadingModal.module.css'

export interface ProgressInfo {
  /** Current item number (1-based) */
  current: number
  /** Total number of items */
  total: number
  /** Name of the current file being processed */
  currentFile?: string
}

export interface LoadingModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Title displayed in the modal */
  title: string
  /** Optional message displayed below the title */
  message?: string
  /** Optional progress information */
  progress?: ProgressInfo
  /** Optional cancel callback - shows cancel button when provided */
  onCancel?: () => void
}

/**
 * A modal dialog that displays a loading spinner.
 * Used to indicate long-running operations like loading large folders.
 * Optionally shows progress information and a cancel button.
 */
export function LoadingModal({
  isOpen,
  title,
  message,
  progress,
  onCancel,
}: LoadingModalProps) {
  const titleId = useId()
  const descId = useId()

  // Debug logging
  console.log('[LoadingModal] Render - isOpen:', isOpen, 'title:', title)

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onCancel) {
        onCancel()
      }
    },
    [onCancel]
  )

  useEffect(() => {
    if (isOpen && onCancel) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onCancel, handleKeyDown])

  if (!isOpen) {
    return null
  }

  const progressPercent = progress ? (progress.current / progress.total) * 100 : 0

  return (
    <div className={styles.overlay}>
      <div
        role="dialog"
        aria-modal="true"
        aria-busy="true"
        aria-labelledby={titleId}
        aria-describedby={message ? descId : undefined}
        className={styles.dialog}
      >
        <div className={styles.content}>
          <div className={styles.spinner} data-testid="loading-spinner" aria-hidden="true" />
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          {message && (
            <p id={descId} className={styles.message} data-testid="loading-message">
              {message}
            </p>
          )}
          {progress && (
            <div className={styles.progressSection}>
              {progress.currentFile && (
                <p className={styles.currentFile}>{progress.currentFile}</p>
              )}
              <p className={styles.progressCount}>
                {progress.current} of {progress.total} files
              </p>
              <div
                role="progressbar"
                aria-valuenow={progress.current}
                aria-valuemin={0}
                aria-valuemax={progress.total}
                className={styles.progressBar}
              >
                <div
                  className={styles.progressFill}
                  data-testid="progress-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
          {onCancel && (
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onCancel}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
