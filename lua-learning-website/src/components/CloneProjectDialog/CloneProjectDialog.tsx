import { useState, useEffect, useRef, useId, useCallback, type KeyboardEvent, type FormEvent } from 'react'
import type { CloneProjectDialogProps, CloneTargetType } from './types'
import styles from './CloneProjectDialog.module.css'

export function CloneProjectDialog({
  isOpen,
  projectName,
  isFileSystemAccessSupported,
  onClone,
  onCancel,
  isFolderAlreadyMounted,
  getUniqueWorkspaceName,
}: CloneProjectDialogProps) {
  const defaultType: CloneTargetType = isFileSystemAccessSupported ? 'local' : 'virtual'
  const [cloneType, setCloneType] = useState<CloneTargetType>(defaultType)
  const [workspaceName, setWorkspaceName] = useState('')
  const [selectedHandle, setSelectedHandle] = useState<FileSystemDirectoryHandle | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSelectingFolder, setIsSelectingFolder] = useState(false)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      const type = isFileSystemAccessSupported ? 'local' : 'virtual'
      setCloneType(type)
      const uniqueName = getUniqueWorkspaceName
        ? getUniqueWorkspaceName(projectName)
        : projectName
      setWorkspaceName(uniqueName)
      setSelectedHandle(null)
      setError(null)
      setIsSelectingFolder(false)
      cancelButtonRef.current?.focus()
    }
  }, [isOpen, projectName, isFileSystemAccessSupported, getUniqueWorkspaceName])

  const isFormValid = cloneType === 'virtual'
    ? workspaceName.trim().length > 0
    : selectedHandle !== null && workspaceName.trim().length > 0

  const handleSelectFolder = useCallback(async () => {
    setError(null)
    setIsSelectingFolder(true)

    try {
      const handle = await window.showDirectoryPicker({
        mode: 'readwrite',
      })

      if (isFolderAlreadyMounted) {
        const isDuplicate = await isFolderAlreadyMounted(handle)
        if (isDuplicate) {
          setError('This folder is already mounted as a workspace.')
          setIsSelectingFolder(false)
          return
        }
      }

      setSelectedHandle(handle)

      const baseName = handle.name
      const uniqueName = getUniqueWorkspaceName
        ? getUniqueWorkspaceName(baseName)
        : baseName
      setWorkspaceName(uniqueName)
    } catch (err) {
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
      if (cloneType === 'virtual') {
        onClone(trimmedName, 'virtual')
      } else if (selectedHandle) {
        onClone(trimmedName, 'local', selectedHandle)
      }
    },
    [cloneType, workspaceName, selectedHandle, isFormValid, onClone]
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

  const handleTypeChange = useCallback((type: CloneTargetType) => {
    setCloneType(type)
    if (type === 'virtual') {
      setSelectedHandle(null)
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
          <h2 id={titleId} className={styles.title}>Clone &ldquo;{projectName}&rdquo;</h2>
        </div>

        <form onSubmit={handleSubmit} className={styles.body}>
          <fieldset className={styles.typeFieldset}>
            <legend className={styles.legend}>Clone To</legend>

            {isFileSystemAccessSupported && (
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="cloneType"
                  value="local"
                  checked={cloneType === 'local'}
                  onChange={() => handleTypeChange('local')}
                  aria-label="Local Folder"
                />
                <div className={styles.radioContent}>
                  <span className={styles.radioLabel}>Local Folder</span>
                  <span className={styles.radioDescription}>
                    Clone into a folder on your computer
                  </span>
                </div>
              </label>
            )}

            <label className={styles.radioOption}>
              <input
                type="radio"
                name="cloneType"
                value="virtual"
                checked={cloneType === 'virtual'}
                onChange={() => handleTypeChange('virtual')}
                aria-label="Virtual Workspace"
              />
              <div className={styles.radioContent}>
                <span className={styles.radioLabel}>Virtual Workspace</span>
                <span className={styles.radioDescription}>
                  Clone into a browser-based workspace
                </span>
              </div>
            </label>
          </fieldset>

          {cloneType === 'local' && (
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Select Folder</label>
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

          <div className={styles.inputGroup}>
            <label htmlFor="cloneWorkspaceName" className={styles.inputLabel}>
              Workspace Name
            </label>
            <input
              id="cloneWorkspaceName"
              type="text"
              className={styles.input}
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="Enter workspace name"
            />
          </div>

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
              className={`${styles.button} ${styles.cloneButton}`}
              disabled={!isFormValid}
            >
              Clone
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
