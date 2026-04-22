import { useState, type KeyboardEvent } from 'react'
import type { ScaleMode } from './types'
import { tooltipWithShortcut, ACTION_SHORTCUTS } from './keyboardShortcuts'
import { BITMAP_FONT_REGISTRY } from '@lua-learning/lua-runtime'
import styles from './AnsiGraphicsEditor.module.css'

export interface FileOptionsModalProps {
  onClose: () => void
  onClear: () => void
  onSave: () => void
  onSaveAs: () => void
  onImportPng: () => void
  onImportLayers: () => void
  onExportAns: () => void
  onExportDosAns: () => void
  onExportSh: () => void
  onExportBat: () => void
  onExportLayers: () => void
  cgaPreview: boolean
  onToggleCgaPreview: () => void
  scaleMode: ScaleMode
  onSetScaleMode: (mode: ScaleMode) => void
  /** Current canvas width in columns. */
  cols: number
  /** Current canvas height in rows. */
  rows: number
  /** Apply a new canvas size. Content is cropped or padded with defaults. */
  onResizeCanvas: (cols: number, rows: number) => void
  /** Active bitmap font ID. */
  font: string
  /** Select a new font for this screen. */
  onSetFont: (id: string) => void
  /** When true, the pixel-perfect renderer is active. */
  useFontBlocks: boolean
  /** Toggle between the pixel renderer (true) and legacy xterm (false). */
  onSetUseFontBlocks: (enabled: boolean) => void
  /** Pixel-perfect emulation on HiDPI: snaps scale to DPR-clean multiple. */
  dprCompensate: boolean
  /** Toggle crisp-pixel mode. */
  onSetDprCompensate: (enabled: boolean) => void
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
  onImportLayers,
  onExportAns,
  onExportDosAns,
  onExportSh,
  onExportBat,
  onExportLayers,
  cgaPreview,
  onToggleCgaPreview,
  scaleMode,
  onSetScaleMode,
  cols,
  rows,
  onResizeCanvas,
  font,
  onSetFont,
  useFontBlocks,
  onSetUseFontBlocks,
  dprCompensate,
  onSetDprCompensate,
}: FileOptionsModalProps) {
  const [nextCols, setNextCols] = useState<string>(String(cols))
  const [nextRows, setNextRows] = useState<string>(String(rows))
  const parsedCols = Number.parseInt(nextCols, 10)
  const parsedRows = Number.parseInt(nextRows, 10)
  const dimsValid =
    Number.isFinite(parsedCols) && parsedCols >= 1 && parsedCols <= 240 &&
    Number.isFinite(parsedRows) && parsedRows >= 1 && parsedRows <= 100
  const dimsChanged = parsedCols !== cols || parsedRows !== rows
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
    { label: 'Import Layers', testId: 'file-import-layers', action: onImportLayers },
    { label: 'Export Layers', testId: 'file-export-layers', action: onExportLayers },
    { label: 'Export ANS', testId: 'file-export-ans', action: onExportAns },
    { label: 'Export ANS (DOS)', testId: 'file-export-dos-ans', action: onExportDosAns },
    { label: 'Export .sh', testId: 'file-export-sh', action: onExportSh },
    { label: 'Export .bat', testId: 'file-export-bat', action: onExportBat },
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
            Font:
            <select
              value={font}
              onChange={e => onSetFont(e.target.value)}
              data-testid="file-font"
              className={styles.fileOptionsSelect}
            >
              {BITMAP_FONT_REGISTRY.map(f => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.fileOptionsAction}>
            <input
              type="checkbox"
              checked={useFontBlocks}
              onChange={e => onSetUseFontBlocks(e.target.checked)}
              data-testid="file-use-font-blocks"
            />
            Use pixel renderer (font blocks)
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
          <label className={styles.fileOptionsAction} title="Snap the scale up to a multiple where scale × DPR is integer, eliminating the 1-2-1-2 pixel pattern on fractional-DPR displays. May render larger than the selected scale.">
            <input
              type="checkbox"
              checked={dprCompensate}
              onChange={e => onSetDprCompensate(e.target.checked)}
              data-testid="file-dpr-compensate"
            />
            Emulate Pixel Perfect on HiDPI
          </label>
          <button
            type="button"
            className={styles.fileOptionsAction}
            onClick={() => handleAction(onClear)}
            data-testid="file-clear"
          >
            Clear
          </button>
          <div className={styles.fileOptionsAction} data-testid="file-resize-canvas-group">
            <span>Canvas size:</span>
            <input
              type="number"
              min={1}
              max={240}
              value={nextCols}
              onChange={e => setNextCols(e.target.value)}
              data-testid="file-resize-cols"
              aria-label="Canvas width in columns"
              className={`${styles.fileOptionsSelect} ${styles.fileOptionsNumberInput}`}
            />
            <span>×</span>
            <input
              type="number"
              min={1}
              max={100}
              value={nextRows}
              onChange={e => setNextRows(e.target.value)}
              data-testid="file-resize-rows"
              aria-label="Canvas height in rows"
              className={`${styles.fileOptionsSelect} ${styles.fileOptionsNumberInput}`}
            />
            <button
              type="button"
              className={styles.fileOptionsAction}
              onClick={() => { if (dimsValid && dimsChanged) handleAction(() => onResizeCanvas(parsedCols, parsedRows)) }}
              disabled={!dimsValid || !dimsChanged}
              data-testid="file-resize-apply"
            >
              Resize
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
