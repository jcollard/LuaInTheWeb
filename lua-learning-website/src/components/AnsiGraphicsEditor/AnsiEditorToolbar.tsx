import { useCallback } from 'react'
import type { BrushMode, BrushSettings, RGBColor } from './types'
import { ColorPalette } from './ColorPalette'
import styles from './AnsiGraphicsEditor.module.css'

export interface AnsiEditorToolbarProps {
  brush: BrushSettings
  onSetFg: (color: RGBColor) => void
  onSetBg: (color: RGBColor) => void
  onSetChar: (char: string) => void
  onSetMode: (mode: BrushMode) => void
  onClear: () => void
  onSave: () => void
  onSaveAs: () => void
}

export function AnsiEditorToolbar({ brush, onSetFg, onSetBg, onSetChar, onSetMode, onClear, onSave, onSaveAs }: AnsiEditorToolbarProps) {
  const handleCharChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (val.length > 0) {
      onSetChar(val[val.length - 1])
    }
  }, [onSetChar])

  return (
    <div className={styles.toolbar} data-testid="ansi-editor-toolbar">
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
    </div>
  )
}
