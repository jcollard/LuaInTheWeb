import type { KeyboardEvent } from 'react'
import type { ScaleMode } from './types'
import { tooltipWithShortcut, ACTION_SHORTCUTS } from './keyboardShortcuts'
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
  scaleMode: ScaleMode
  onSetScaleMode: (mode: ScaleMode) => void
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
  scaleMode,
  onSetScaleMode,
}: FileOptionsModalProps) {
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
    { label: tooltipWithShortcut('Save', ACTION_SHORTCUTS.save), testId: 'file-save', action: onSave },
    { label: tooltipWithShortcut('Save As', ACTION_SHORTCUTS.saveAs), testId: 'file-save-as', action: onSaveAs },
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
          <label className={styles.fileOptionsAction}>
            Scale:
            <select
              value={scaleMode}
              onChange={e => onSetScaleMode(e.target.value as ScaleMode)}
              data-testid="file-scale-mode"
              className={styles.fileOptionsSelect}
            >
              <option value="integer-auto">Integer Auto</option>
              <option value="integer-1x">Integer 1x</option>
              <option value="integer-2x">Integer 2x</option>
              <option value="integer-3x">Integer 3x</option>
              <option value="fit">Fit</option>
              <option value="fill">Fill</option>
            </select>
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
