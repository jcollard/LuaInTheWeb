import { useState, useCallback, useRef, useEffect, useId, type KeyboardEvent } from 'react'
import type { TreeNode } from '../../hooks/fileSystemTypes'
import { DirectoryPicker } from './DirectoryPicker'
import styles from './SaveAsDialog.module.css'

export interface SaveAsDialogProps {
  isOpen: boolean
  tree: TreeNode[]
  onSave: (folderPath: string, fileName: string) => void
  onCancel: () => void
}

const EXTENSION = '.ansi.lua'

function ensureExtension(name: string): string {
  if (name.endsWith(EXTENSION)) return name
  // Strip partial extensions if present (e.g. ".ansi" or ".lua")
  const stripped = name.replace(/\.ansi$|\.lua$/, '')
  return stripped + EXTENSION
}

export function SaveAsDialog({ isOpen, tree, onSave, onCancel }: SaveAsDialogProps) {
  const [selectedPath, setSelectedPath] = useState('/')
  const [fileName, setFileName] = useState('untitled.ansi.lua')
  const [error, setError] = useState('')

  const filenameInputRef = useRef<HTMLInputElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const saveButtonRef = useRef<HTMLButtonElement>(null)

  const titleId = useId()

  // Focus filename input when dialog opens
  useEffect(() => {
    if (isOpen && filenameInputRef.current) {
      filenameInputRef.current.focus()
      filenameInputRef.current.select()
    }
  }, [isOpen])

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPath('/')
      setFileName('untitled.ansi.lua')
      setError('')
    }
  }, [isOpen])

  const handleSave = useCallback(() => {
    const trimmed = fileName.trim()
    if (!trimmed || trimmed === EXTENSION) {
      setError('Please enter a file name.')
      return
    }
    const finalName = ensureExtension(trimmed)
    setError('')
    onSave(selectedPath, finalName)
  }, [fileName, selectedPath, onSave])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'Escape':
        event.preventDefault()
        onCancel()
        break
      case 'Enter':
        // Only trigger save if focus is not on a tree item
        if (
          document.activeElement === filenameInputRef.current ||
          document.activeElement === saveButtonRef.current
        ) {
          event.preventDefault()
          handleSave()
        }
        break
      case 'Tab':
        // Let tab work naturally between elements
        break
    }
  }, [onCancel, handleSave])

  if (!isOpen) return null

  return (
    <div className={styles.overlay} data-testid="save-as-overlay">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={styles.dialog}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>Save As</h2>
        </div>
        <div className={styles.body}>
          <div>
            <div className={styles.label}>Location</div>
            <DirectoryPicker
              tree={tree}
              selectedPath={selectedPath}
              onSelect={setSelectedPath}
            />
          </div>
          <div className={styles.filenameGroup}>
            <label className={styles.label} htmlFor="save-as-filename">File name</label>
            <input
              ref={filenameInputRef}
              id="save-as-filename"
              className={styles.filenameInput}
              type="text"
              value={fileName}
              onChange={e => {
                setFileName(e.target.value)
                setError('')
              }}
              data-testid="save-as-filename"
            />
            {error && <div className={styles.errorMessage} data-testid="save-as-error">{error}</div>}
          </div>
        </div>
        <div className={styles.footer}>
          <button
            ref={cancelButtonRef}
            type="button"
            className={`${styles.button} ${styles.cancelButton}`}
            onClick={onCancel}
            data-testid="save-as-cancel"
          >
            Cancel
          </button>
          <button
            ref={saveButtonRef}
            type="button"
            className={`${styles.button} ${styles.saveButton}`}
            onClick={handleSave}
            data-testid="save-as-save"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
