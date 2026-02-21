import type { KeyboardEvent } from 'react'
import styles from './AnsiGraphicsEditor.module.css'

export interface FileOptionsModalProps {
  isOpen: boolean
  onClose: () => void
  onClear: () => void
  onSave: () => void
  onSaveAs: () => void
  onImportPng: () => void
  onExportAns: () => void
  onExportSh: () => void
  cgaPreview: boolean
  onToggleCgaPreview: () => void
}

export function FileOptionsModal({
  isOpen,
  onClose,
  onClear,
  onSave,
  onSaveAs,
  onImportPng,
  onExportAns,
  onExportSh,
  cgaPreview,
  onToggleCgaPreview,
}: FileOptionsModalProps) {
  if (!isOpen) {
    return null
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }

  const handleAction = (action: () => void) => {
    action()
    onClose()
  }

  return (
    <div
      className={styles.fileOptionsOverlay}
      data-testid="file-options-overlay"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={styles.fileOptionsDialog}
        onKeyDown={handleKeyDown}
        onClick={e => e.stopPropagation()}
        tabIndex={-1}
      >
        <div className={styles.fileOptionsHeader}>
          <span className={styles.fileOptionsTitle}>File Options</span>
          <button
            type="button"
            className={styles.fileOptionsClose}
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className={styles.fileOptionsBody}>
          <button
            type="button"
            className={styles.fileOptionsAction}
            onClick={() => handleAction(onSave)}
            data-testid="file-save"
          >
            Save
          </button>
          <button
            type="button"
            className={styles.fileOptionsAction}
            onClick={() => handleAction(onSaveAs)}
            data-testid="file-save-as"
          >
            Save As
          </button>
          <button
            type="button"
            className={styles.fileOptionsAction}
            onClick={() => handleAction(onImportPng)}
            data-testid="file-import-png"
          >
            Load PNG
          </button>
          <button
            type="button"
            className={styles.fileOptionsAction}
            onClick={() => handleAction(onExportAns)}
            data-testid="file-export-ans"
          >
            Export ANS
          </button>
          <button
            type="button"
            className={styles.fileOptionsAction}
            onClick={() => handleAction(onExportSh)}
            data-testid="file-export-sh"
          >
            Export .sh
          </button>
          <label className={styles.fileOptionsAction}>
            <input
              type="checkbox"
              checked={cgaPreview}
              onChange={onToggleCgaPreview}
              data-testid="file-cga-preview"
            />
            CGA Preview
          </label>
          <button
            type="button"
            className={styles.fileOptionsAction}
            onClick={() => handleAction(onClear)}
            data-testid="file-clear"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  )
}
