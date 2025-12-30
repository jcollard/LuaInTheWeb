import { useEffect, useRef, useId, type KeyboardEvent } from 'react'
import styles from './UploadConflictDialog.module.css'
import type { UploadConflictDialogProps } from './types'

/**
 * File icon SVG component
 */
function FileIcon() {
  return (
    <svg
      className={styles.fileIcon}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M13.85 4.44l-3.28-3.3-.71-.14H2.5l-.5.5v13l.5.5h11l.5-.5V4.8l-.15-.36zM13 14H3V2h6v3.5l.5.5H13v8zm0-9h-3V2.5l3 3z" />
    </svg>
  )
}

export function UploadConflictDialog({
  isOpen,
  conflictingFiles,
  onConfirm,
  onCancel,
}: UploadConflictDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const confirmButtonRef = useRef<HTMLButtonElement>(null)

  const titleId = useId()
  const descId = useId()

  // Focus cancel button when dialog opens
  useEffect(() => {
    if (isOpen && cancelButtonRef.current) {
      cancelButtonRef.current.focus()
    }
  }, [isOpen])

  // Handle keyboard navigation
  const handleKeyDown = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'Escape':
        event.preventDefault()
        onCancel()
        break
      case 'Enter':
        event.preventDefault()
        onConfirm()
        break
      case 'Tab':
        // Trap focus within dialog
        event.preventDefault()
        if (document.activeElement === cancelButtonRef.current) {
          confirmButtonRef.current?.focus()
        } else {
          cancelButtonRef.current?.focus()
        }
        break
    }
  }

  if (!isOpen || conflictingFiles.length === 0) {
    return null
  }

  const fileCount = conflictingFiles.length
  const message = fileCount === 1
    ? 'The following file already exists in this location:'
    : `The following ${fileCount} files already exist in this location:`

  return (
    <div className={styles.overlay} data-testid="upload-conflict-dialog-overlay">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={styles.dialog}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
        data-testid="upload-conflict-dialog"
      >
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>Replace Existing Files?</h2>
        </div>
        <div className={styles.body}>
          <p id={descId} className={styles.message}>{message}</p>
          <ul className={styles.fileList} data-testid="conflict-file-list">
            {conflictingFiles.map((fileName) => (
              <li key={fileName} className={styles.fileItem}>
                <FileIcon />
                <span className={styles.fileName}>{fileName}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.footer}>
          <button
            ref={cancelButtonRef}
            type="button"
            className={`${styles.button} ${styles.cancelButton}`}
            onClick={onCancel}
            data-testid="conflict-cancel-button"
          >
            Cancel
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            className={`${styles.button} ${styles.confirmButton}`}
            onClick={onConfirm}
            data-testid="conflict-replace-button"
          >
            Replace
          </button>
        </div>
      </div>
    </div>
  )
}
