import { useState, useEffect, useRef, useId, useCallback, type KeyboardEvent, type FormEvent } from 'react'
import type { AddWorkspaceDialogProps, WorkspaceTypeSelection } from './types'
import styles from './AddWorkspaceDialog.module.css'

export function AddWorkspaceDialog({
  isOpen,
  isFileSystemAccessSupported,
  onCreateVirtual,
  onCreateLocal,
  onCancel,
}: AddWorkspaceDialogProps) {
  const [workspaceType, setWorkspaceType] = useState<WorkspaceTypeSelection>('virtual')
  const [workspaceName, setWorkspaceName] = useState('New Workspace')
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setWorkspaceType('virtual')
      setWorkspaceName('New Workspace')
      // Focus cancel button when opened
      cancelButtonRef.current?.focus()
    }
  }, [isOpen])

  const isNameValid = workspaceName.trim().length > 0

  const handleSubmit = useCallback(
    (event?: FormEvent) => {
      event?.preventDefault()
      if (!isNameValid) return

      const trimmedName = workspaceName.trim()
      if (workspaceType === 'virtual') {
        onCreateVirtual(trimmedName)
      } else {
        onCreateLocal(trimmedName)
      }
    },
    [workspaceType, workspaceName, isNameValid, onCreateVirtual, onCreateLocal]
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCancel()
      }
    },
    [onCancel]
  )

  if (!isOpen) {
    return null
  }

  return (
    <div className={styles.overlay} onKeyDown={handleKeyDown}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={styles.dialog}
      >
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>Add Workspace</h2>
        </div>

        <form onSubmit={handleSubmit} className={styles.body}>
          <fieldset className={styles.typeFieldset}>
            <legend className={styles.legend}>Workspace Type</legend>

            <label className={styles.radioOption}>
              <input
                type="radio"
                name="workspaceType"
                value="virtual"
                checked={workspaceType === 'virtual'}
                onChange={() => setWorkspaceType('virtual')}
                aria-label="Virtual Workspace"
              />
              <div className={styles.radioContent}>
                <span className={styles.radioLabel}>Virtual Workspace</span>
                <span className={styles.radioDescription}>
                  Create a new browser-based workspace
                </span>
              </div>
            </label>

            <label className={`${styles.radioOption} ${!isFileSystemAccessSupported ? styles.disabled : ''}`}>
              <input
                type="radio"
                name="workspaceType"
                value="local"
                checked={workspaceType === 'local'}
                onChange={() => setWorkspaceType('local')}
                disabled={!isFileSystemAccessSupported}
                aria-label="Local Folder"
              />
              <div className={styles.radioContent}>
                <span className={styles.radioLabel}>Local Folder</span>
                <span className={styles.radioDescription}>
                  Open a folder from your computer
                </span>
                {!isFileSystemAccessSupported && (
                  <span className={styles.warning}>
                    Not supported in this browser
                  </span>
                )}
              </div>
            </label>
          </fieldset>

          <div className={styles.inputGroup}>
            <label htmlFor="workspaceName" className={styles.inputLabel}>
              Workspace Name
            </label>
            <input
              id="workspaceName"
              type="text"
              className={styles.input}
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="Enter workspace name"
            />
          </div>

          <div className={styles.footer}>
            <button
              ref={cancelButtonRef}
              type="button"
              className={`${styles.button} ${styles.cancelButton}`}
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`${styles.button} ${styles.createButton}`}
              disabled={!isNameValid}
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
