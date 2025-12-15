import { useState, useEffect, useRef, useId, useCallback, type KeyboardEvent, type FormEvent } from 'react'
import type { AddWorkspaceDialogProps, WorkspaceTypeSelection } from './types'
import styles from './AddWorkspaceDialog.module.css'

export function AddWorkspaceDialog({
  isOpen,
  isFileSystemAccessSupported,
  onCreateVirtual,
  onCreateLocal,
  onCancel,
  isFolderAlreadyMounted,
  getUniqueWorkspaceName,
}: AddWorkspaceDialogProps) {
  const [workspaceType, setWorkspaceType] = useState<WorkspaceTypeSelection>('virtual')
  const [workspaceName, setWorkspaceName] = useState('')
  const [selectedHandle, setSelectedHandle] = useState<FileSystemDirectoryHandle | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSelectingFolder, setIsSelectingFolder] = useState(false)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setWorkspaceType('virtual')
      setWorkspaceName('')
      setSelectedHandle(null)
      setError(null)
      setIsSelectingFolder(false)
      // Focus cancel button when opened
      cancelButtonRef.current?.focus()
    }
  }, [isOpen])

  // For virtual workspaces, name must be non-empty
  // For local workspaces, must have selected a folder and name must be non-empty
  const isFormValid = workspaceType === 'virtual'
    ? workspaceName.trim().length > 0
    : selectedHandle !== null && workspaceName.trim().length > 0

  const handleSelectFolder = useCallback(async () => {
    setError(null)
    setIsSelectingFolder(true)

    try {
      const handle = await window.showDirectoryPicker({
        mode: 'readwrite',
      })

      // Check for duplicate mount
      if (isFolderAlreadyMounted) {
        const isDuplicate = await isFolderAlreadyMounted(handle)
        if (isDuplicate) {
          setError('This folder is already mounted as a workspace.')
          setIsSelectingFolder(false)
          return
        }
      }

      setSelectedHandle(handle)

      // Pre-fill name with folder name, ensuring uniqueness
      const baseName = handle.name
      const uniqueName = getUniqueWorkspaceName
        ? getUniqueWorkspaceName(baseName)
        : baseName
      setWorkspaceName(uniqueName)
    } catch (err) {
      // User cancelled or error occurred
      if ((err as Error).name !== 'AbortError') {
        setError('Failed to select folder. Please try again.')
      }
    } finally {
      setIsSelectingFolder(false)
    }
  }, [isFolderAlreadyMounted, getUniqueWorkspaceName])

  const handleSubmit = useCallback(
    (event?: FormEvent) => {
      event?.preventDefault()
      if (!isFormValid) return

      const trimmedName = workspaceName.trim()
      if (workspaceType === 'virtual') {
        onCreateVirtual(trimmedName)
      } else if (selectedHandle) {
        onCreateLocal(trimmedName, selectedHandle)
      }
    },
    [workspaceType, workspaceName, selectedHandle, isFormValid, onCreateVirtual, onCreateLocal]
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

  const handleTypeChange = useCallback((type: WorkspaceTypeSelection) => {
    setWorkspaceType(type)
    // Reset state when changing type
    if (type === 'virtual') {
      setSelectedHandle(null)
      setWorkspaceName('')
    } else {
      setWorkspaceName('')
    }
    setError(null)
  }, [])

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
                onChange={() => handleTypeChange('virtual')}
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
                onChange={() => handleTypeChange('local')}
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

          {/* For local workspaces: show folder selector first */}
          {workspaceType === 'local' && (
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Selected Folder</label>
              <div className={styles.folderSelector}>
                {selectedHandle ? (
                  <span className={styles.selectedFolder}>{selectedHandle.name}</span>
                ) : (
                  <span className={styles.noFolderSelected}>No folder selected</span>
                )}
                <button
                  type="button"
                  className={styles.selectFolderButton}
                  onClick={handleSelectFolder}
                  disabled={isSelectingFolder}
                >
                  {isSelectingFolder ? 'Selecting...' : selectedHandle ? 'Change' : 'Select Folder'}
                </button>
              </div>
            </div>
          )}

          {/* Show name input: always for virtual, after folder selection for local */}
          {(workspaceType === 'virtual' || selectedHandle) && (
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
          )}

          {/* Error message */}
          {error && (
            <div className={styles.error} role="alert">
              {error}
            </div>
          )}

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
              disabled={!isFormValid}
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
