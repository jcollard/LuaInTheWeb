import { useState, type KeyboardEvent, type ReactNode } from 'react'
import type { ScaleMode } from './types'
import { tooltipWithShortcut, ACTION_SHORTCUTS } from './keyboardShortcuts'
import { BITMAP_FONT_REGISTRY } from '@lua-learning/lua-runtime'
import type { EyedropperModifier } from './eyedropperModifierPersistence'
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
  /** Modifier key that enables click-to-sample-color outside the eyedropper tool. */
  eyedropperModifier: EyedropperModifier
  /** Update the eyedropper modifier preference. */
  onSetEyedropperModifier: (modifier: EyedropperModifier) => void
}

interface ActionItem {
  label: string
  testId: string
  action: () => void
}

type TabId = 'file' | 'canvas' | 'input'

interface Tab {
  id: TabId
  label: string
  testId: string
}

const TABS: readonly Tab[] = [
  { id: 'file', label: 'File', testId: 'file-options-tab-file' },
  { id: 'canvas', label: 'Canvas', testId: 'file-options-tab-canvas' },
  { id: 'input', label: 'Input', testId: 'file-options-tab-input' },
]

export function FileOptionsModal(props: FileOptionsModalProps) {
  const { onClose } = props
  const [activeTab, setActiveTab] = useState<TabId>('file')

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
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
        <div className={styles.charPaletteTabs} role="tablist" data-testid="file-options-tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`${styles.paletteSelectorBtn} ${activeTab === tab.id ? styles.paletteSelectorBtnActive : ''}`}
              onClick={() => setActiveTab(tab.id)}
              data-testid={tab.testId}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className={styles.fileOptionsBody}>
          {activeTab === 'file' && <FileTab {...props} />}
          {activeTab === 'canvas' && <CanvasTab {...props} />}
          {activeTab === 'input' && <InputTab {...props} />}
        </div>
      </div>
    </div>
  )
}

function FileTab(props: FileOptionsModalProps): ReactNode {
  const { onClose, onSave, onSaveAs, onImportPng, onImportLayers, onExportLayers, onExportAns, onExportDosAns, onExportSh, onExportBat } = props

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
    <>
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
    </>
  )
}

function CanvasTab(props: FileOptionsModalProps): ReactNode {
  const {
    onClose, onClear,
    cgaPreview, onToggleCgaPreview,
    scaleMode, onSetScaleMode,
    cols, rows, onResizeCanvas,
    font, onSetFont,
    useFontBlocks, onSetUseFontBlocks,
    dprCompensate, onSetDprCompensate,
  } = props

  const [nextCols, setNextCols] = useState<string>(String(cols))
  const [nextRows, setNextRows] = useState<string>(String(rows))
  const parsedCols = Number.parseInt(nextCols, 10)
  const parsedRows = Number.parseInt(nextRows, 10)
  const dimsValid =
    Number.isFinite(parsedCols) && parsedCols >= 1 && parsedCols <= 240 &&
    Number.isFinite(parsedRows) && parsedRows >= 1 && parsedRows <= 100
  const dimsChanged = parsedCols !== cols || parsedRows !== rows

  function handleAction(action: () => void): void {
    action()
    onClose()
  }

  return (
    <>
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
    </>
  )
}

function InputTab(props: FileOptionsModalProps): ReactNode {
  const { eyedropperModifier, onSetEyedropperModifier } = props
  return (
    <>
      <label
        className={styles.fileOptionsAction}
        title="Hold this modifier and click on the canvas to sample the foreground color; right-click samples the background color."
      >
        Eyedropper modifier:
        <select
          value={eyedropperModifier}
          onChange={e => onSetEyedropperModifier(e.target.value as EyedropperModifier)}
          data-testid="file-eyedropper-modifier"
          className={styles.fileOptionsSelect}
        >
          <option value="ctrl">Ctrl</option>
          <option value="shift">Shift</option>
          <option value="alt">Alt</option>
          <option value="meta">Meta (⌘ / Win)</option>
        </select>
      </label>
      <p className={styles.fileOptionsHelp} data-testid="file-eyedropper-modifier-help">
        Hold the selected modifier and click on the canvas to sample the foreground color.
        Right-click samples the background color. Plain right-click (no modifier) always copies the character.
      </p>
    </>
  )
}
