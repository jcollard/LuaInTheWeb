import { useCallback } from 'react'
import type { BrushMode, DrawTool, BrushSettings } from './types'
import styles from './AnsiGraphicsEditor.module.css'

export interface AnsiEditorToolbarProps {
  brush: BrushSettings
  onSetChar: (char: string) => void
  onSetMode: (mode: BrushMode) => void
  onSetTool: (tool: DrawTool) => void
  onClear: () => void
  onSave: () => void
  onSaveAs: () => void
  onImportPng: () => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
}

export function AnsiEditorToolbar({
  brush, onSetChar, onSetMode, onSetTool, onClear, onSave, onSaveAs,
  onImportPng, onUndo, onRedo, canUndo, canRedo,
}: AnsiEditorToolbarProps) {
  const isRectActive = brush.tool === 'rect-outline' || brush.tool === 'rect-filled'

  const handleCharChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (val.length > 0) {
      onSetChar(val[val.length - 1])
    }
  }, [onSetChar])

  return (
    <div className={styles.toolbar} data-testid="ansi-editor-toolbar">
      <div className={styles.modeGroup}>
        <span className={styles.modeLabel}>Tool</span>
        <button
          type="button"
          className={`${styles.modeButton} ${brush.tool === 'pencil' ? styles.modeButtonActive : ''}`}
          aria-pressed={brush.tool === 'pencil'}
          onClick={() => onSetTool('pencil')}
          title="Pencil"
          data-testid="tool-pencil"
        >
          ✏
        </button>
        <button
          type="button"
          className={`${styles.modeButton} ${brush.tool === 'line' ? styles.modeButtonActive : ''}`}
          aria-pressed={brush.tool === 'line'}
          onClick={() => onSetTool('line')}
          title="Line"
          data-testid="tool-line"
        >
          ╱
        </button>
        <div className={styles.toolFlyoutWrapper}>
          <button
            type="button"
            className={`${styles.modeButton} ${isRectActive ? styles.modeButtonActive : ''}`}
            aria-pressed={isRectActive}
            title="Rectangle"
            data-testid="tool-rect"
          >
            {brush.tool === 'rect-filled' ? '■' : '▭'}
          </button>
          <div className={styles.toolFlyout} data-testid="rect-flyout">
            <button
              type="button"
              className={`${styles.flyoutOption} ${brush.tool === 'rect-outline' ? styles.flyoutOptionActive : ''}`}
              onClick={() => onSetTool('rect-outline')}
              data-testid="tool-rect-outline"
            >
              ▭ Outline
            </button>
            <button
              type="button"
              className={`${styles.flyoutOption} ${brush.tool === 'rect-filled' ? styles.flyoutOptionActive : ''}`}
              onClick={() => onSetTool('rect-filled')}
              data-testid="tool-rect-filled"
            >
              ■ Filled
            </button>
          </div>
        </div>
        <button
          type="button"
          className={`${styles.modeButton} ${brush.tool === 'flood-fill' ? styles.modeButtonActive : ''}`}
          aria-pressed={brush.tool === 'flood-fill'}
          onClick={() => onSetTool('flood-fill')}
          title="Flood Fill"
          data-testid="tool-flood-fill"
        >
          Fill
        </button>
        <button
          type="button"
          className={`${styles.modeButton} ${brush.tool === 'select' ? styles.modeButtonActive : ''}`}
          aria-pressed={brush.tool === 'select'}
          onClick={() => onSetTool('select')}
          title="Select"
          data-testid="tool-select"
        >
          ⬚
        </button>
      </div>
      <div className={styles.modeGroup}>
        <span className={styles.modeLabel}>Mode</span>
        <button
          type="button"
          className={`${styles.modeButton} ${brush.mode === 'brush' ? styles.modeButtonActive : ''}`}
          aria-pressed={brush.mode === 'brush'}
          onClick={() => onSetMode('brush')}
          title="Brush"
          data-testid="mode-brush"
        >
          #
        </button>
        <button
          type="button"
          className={`${styles.modeButton} ${brush.mode === 'pixel' ? styles.modeButtonActive : ''}`}
          aria-pressed={brush.mode === 'pixel'}
          onClick={() => onSetMode('pixel')}
          title="Pixel"
          data-testid="mode-pixel"
        >
          ▀
        </button>
        <button
          type="button"
          className={`${styles.modeButton} ${brush.mode === 'eraser' ? styles.modeButtonActive : ''}`}
          aria-pressed={brush.mode === 'eraser'}
          onClick={() => onSetMode('eraser')}
          title="Eraser"
          data-testid="mode-eraser"
        >
          ⌫
        </button>
      </div>
      {brush.mode === 'brush' && (
        <div className={styles.charGroup}>
          <label className={styles.charLabel} htmlFor="ansi-editor-char">Char</label>
          <input
            id="ansi-editor-char"
            className={styles.charInput}
            type="text"
            value={brush.char}
            onChange={handleCharChange}
            maxLength={1}
            data-testid="char-input"
          />
        </div>
      )}
      <button
        type="button"
        className={styles.toolbarButton}
        onClick={onClear}
        title="Clear canvas"
        data-testid="clear-button"
      >
        Clear
      </button>
      <button
        type="button"
        className={styles.toolbarButton}
        onClick={onSave}
        title="Save"
        data-testid="save-button"
      >
        Save
      </button>
      <button
        type="button"
        className={styles.toolbarButton}
        onClick={onSaveAs}
        title="Save As"
        data-testid="save-as-button"
      >
        Save As
      </button>
      <button
        type="button"
        className={styles.toolbarButton}
        onClick={onImportPng}
        title="Import PNG as layer"
        data-testid="import-png-button"
      >
        Load PNG
      </button>
      <button
        type="button"
        className={styles.toolbarButton}
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo"
        data-testid="undo-button"
      >
        ↶
      </button>
      <button
        type="button"
        className={styles.toolbarButton}
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo"
        data-testid="redo-button"
      >
        ↷
      </button>
    </div>
  )
}
