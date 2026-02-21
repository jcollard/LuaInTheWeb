import type { KeyboardEvent } from 'react'
import styles from './AnsiGraphicsEditor.module.css'

export interface FileOptionsModalProps {
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

interface ActionItem {
  label: string
  testId: string
  action: () => void
}

export function FileOptionsModal({
  onClose,
  onClear,
  onSave,
  onSaveAs,
  onImportPng,
  onExportAns,
  onExportSh,
  cgaPreview,
  onToggleCgaPreview,
}: FileOptionsModalProps): JSX.Element {
  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }

  function handleAction(action: () => void): void {
    action()
    onClose()
  }

  const actions: ActionItem[] = [
    { label: 'Save', testId: 'file-save', action: onSave },
    { label: 'Save As', testId: 'file-save-as', action: onSaveAs },
    { label: 'Load PNG', testId: 'file-import-png', action: onImportPng },
    { label: 'Export ANS', testId: 'file-export-ans', action: onExportAns },
    { label: 'Export .sh', testId: 'file-export-sh', action: onExportSh },
  ]

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
          {actions.map(({ label, testId, action }) => (
            <button
              key={testId}
              type="button"
              className={styles.fileOptionsAction}
              onClick={() => handleAction(action)}
              data-testid={testId}
            >
              {label}
            </button>
          ))}
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
