import { useRef, useId, useEffect } from 'react'
import type { CloneProjectDialogProps } from './types'
import { useCloneProjectForm } from './useCloneProjectForm'
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
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  const {
    cloneType,
    workspaceName,
    selectedHandle,
    error,
    isSelectingFolder,
    isFormValid,
    setWorkspaceName,
    handleSelectFolder,
    handleSubmit,
    handleKeyDown,
    handleTypeChange,
  } = useCloneProjectForm({
    isOpen,
    projectName,
    isFileSystemAccessSupported,
    onClone,
    onCancel,
    isFolderAlreadyMounted,
    getUniqueWorkspaceName,
  })

  useEffect(() => {
    if (isOpen) {
      cancelButtonRef.current?.focus()
    }
  }, [isOpen])

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
