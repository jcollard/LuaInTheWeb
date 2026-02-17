import { useCallback } from 'react'
import type { BrushMode, DrawTool, BrushSettings, RGBColor } from './types'
import { ColorPalette } from './ColorPalette'
import styles from './AnsiGraphicsEditor.module.css'

export interface AnsiEditorToolbarProps {
  brush: BrushSettings
  onSetFg: (color: RGBColor) => void
  onSetBg: (color: RGBColor) => void
  onSetChar: (char: string) => void
  onSetMode: (mode: BrushMode) => void
  onSetTool: (tool: DrawTool) => void
  onClear: () => void
  onSave: () => void
  onSaveAs: () => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
}

export function AnsiEditorToolbar({
  brush, onSetFg, onSetBg, onSetChar, onSetMode, onSetTool, onClear, onSave, onSaveAs,
  onUndo, onRedo, canUndo, canRedo,
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
          data-testid="tool-pencil"
        >
          ✏
        </button>
        <button
          type="button"
          className={`${styles.modeButton} ${brush.tool === 'line' ? styles.modeButtonActive : ''}`}
          aria-pressed={brush.tool === 'line'}
          onClick={() => onSetTool('line')}
          data-testid="tool-line"
        >
          ╱
        </button>
        <div className={styles.toolFlyoutWrapper}>
          <button
            type="button"
            className={`${styles.modeButton} ${isRectActive ? styles.modeButtonActive : ''}`}
            aria-pressed={isRectActive}
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
          data-testid="tool-flood-fill"
        >
          Fill
        </button>
      </div>
      <div className={styles.modeGroup}>
        <span className={styles.modeLabel}>Mode</span>
        <button
          type="button"
          className={`${styles.modeButton} ${brush.mode === 'brush' ? styles.modeButtonActive : ''}`}
          aria-pressed={brush.mode === 'brush'}
          onClick={() => onSetMode('brush')}
          data-testid="mode-brush"
        >
          #
        </button>
        <button
          type="button"
          className={`${styles.modeButton} ${brush.mode === 'pixel' ? styles.modeButtonActive : ''}`}
          aria-pressed={brush.mode === 'pixel'}
          onClick={() => onSetMode('pixel')}
          data-testid="mode-pixel"
        >
          ▀
        </button>
        <button
          type="button"
          className={`${styles.modeButton} ${brush.mode === 'eraser' ? styles.modeButtonActive : ''}`}
          aria-pressed={brush.mode === 'eraser'}
          onClick={() => onSetMode('eraser')}
          data-testid="mode-eraser"
        >
          ⌫
        </button>
      </div>
      <ColorPalette label="FG" selected={brush.fg} onSelect={onSetFg} />
      {brush.mode === 'brush' && (
        <>
          <ColorPalette label="BG" selected={brush.bg} onSelect={onSetBg} />
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
        </>
      )}
      <button
        type="button"
        className={styles.toolbarButton}
        onClick={onClear}
        data-testid="clear-button"
      >
        Clear
      </button>
      <button
        type="button"
        className={styles.toolbarButton}
        onClick={onSave}
        data-testid="save-button"
      >
        Save
      </button>
      <button
        type="button"
        className={styles.toolbarButton}
        onClick={onSaveAs}
        data-testid="save-as-button"
      >
        Save As
      </button>
      <button
        type="button"
        className={styles.toolbarButton}
        onClick={onUndo}
        disabled={!canUndo}
        data-testid="undo-button"
      >
        ↶
      </button>
      <button
        type="button"
        className={styles.toolbarButton}
        onClick={onRedo}
        disabled={!canRedo}
        data-testid="redo-button"
      >
        ↷
      </button>
    </div>
  )
}
