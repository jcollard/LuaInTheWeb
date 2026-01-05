/**
 * Error recovery dialog component.
 *
 * Displays when an unhandled error occurs, providing options to:
 * - View error details
 * - Reload the page
 * - Reset cache (with backup download)
 */

import { useState, useId, type KeyboardEvent } from 'react'
import styles from './ErrorRecoveryDialog.module.css'
import type { ErrorRecoveryDialogProps } from './types'

/**
 * Error recovery dialog with options to reload or reset cache.
 */
export function ErrorRecoveryDialog({
  error,
  componentStack,
  onReload,
  onResetCache,
  onExportData,
}: ErrorRecoveryDialogProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [showConfirmReset, setShowConfirmReset] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const titleId = useId()
  const descId = useId()
  const confirmTitleId = useId()
  const confirmDescId = useId()

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      if (showConfirmReset) {
        setShowConfirmReset(false)
      } else {
        onReload()
      }
    }
  }

  const toggleDetails = () => {
    setShowDetails((prev) => !prev)
  }

  const handleResetClick = () => {
    setShowConfirmReset(true)
  }

  const handleCancelReset = () => {
    setShowConfirmReset(false)
  }

  const handleDownloadBackup = async () => {
    setIsExporting(true)
    try {
      if (onExportData) {
        await onExportData()
      }
    } finally {
      setIsExporting(false)
    }
  }

  const handleReset = async () => {
    await onResetCache()
  }

  // Confirmation modal for reset
  if (showConfirmReset) {
    return (
      <div className={styles.container}>
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={confirmTitleId}
          aria-describedby={confirmDescId}
          className={styles.dialog}
          onKeyDown={handleKeyDown}
          tabIndex={-1}
        >
          <div className={styles.header}>
            <h1 id={confirmTitleId} className={styles.title}>
              <span className={styles.warningIcon}>⚠</span>
              Reset Cache?
            </h1>
          </div>

          <div className={styles.body}>
            <p id={confirmDescId} className={styles.description}>
              <strong>This will erase all your saved data</strong>, including workspace files,
              settings, and local folder connections.
            </p>
            <p className={styles.description}>
              We recommend downloading a backup of your data first.
            </p>
          </div>

          <div className={styles.footerVertical}>
            <button
              type="button"
              className={`${styles.button} ${styles.primaryButton} ${styles.fullWidth}`}
              onClick={handleDownloadBackup}
              disabled={isExporting}
            >
              {isExporting ? 'Exporting...' : 'Download Backup'}
            </button>
            <button
              type="button"
              className={`${styles.button} ${styles.dangerButton} ${styles.fullWidth}`}
              onClick={handleReset}
              disabled={isExporting}
            >
              Reset Cache
            </button>
            <button
              type="button"
              className={`${styles.button} ${styles.secondaryButton} ${styles.fullWidth}`}
              onClick={handleCancelReset}
              disabled={isExporting}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={styles.dialog}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <div className={styles.header}>
          <h1 id={titleId} className={styles.title}>
            <span className={styles.errorIcon}>⚠</span>
            Something went wrong
          </h1>
        </div>

        <div className={styles.body}>
          <p id={descId} className={styles.description}>
            An unexpected error occurred. You can try reloading the page, or if the
            problem persists, reset the cache to clear any corrupted data.
          </p>

          <button
            type="button"
            className={styles.detailsButton}
            onClick={toggleDetails}
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>

          {showDetails && (
            <div className={styles.detailsPanel}>
              <p className={styles.errorMessage}>
                {error.name}: {error.message}
              </p>
              {componentStack && (
                <pre className={styles.stackTrace}>{componentStack}</pre>
              )}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className={`${styles.button} ${styles.secondaryButton}`}
            onClick={handleResetClick}
          >
            Backup and Reset Cache
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.primaryButton}`}
            onClick={onReload}
          >
            Reload
          </button>
        </div>
      </div>
    </div>
  )
}
