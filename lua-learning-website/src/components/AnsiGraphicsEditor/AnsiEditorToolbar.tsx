import { useCallback } from 'react'
import type { BrushSettings, RGBColor } from './types'
import { ColorPalette } from './ColorPalette'
import styles from './AnsiGraphicsEditor.module.css'

export interface AnsiEditorToolbarProps {
  brush: BrushSettings
  onSetFg: (color: RGBColor) => void
  onSetBg: (color: RGBColor) => void
  onSetChar: (char: string) => void
  onClear: () => void
  onSave: () => void
  onSaveAs: () => void
}

export function AnsiEditorToolbar({ brush, onSetFg, onSetBg, onSetChar, onClear, onSave, onSaveAs }: AnsiEditorToolbarProps) {
  const handleCharChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (val.length > 0) {
      onSetChar(val[val.length - 1])
    }
  }, [onSetChar])

  return (
    <div className={styles.toolbar} data-testid="ansi-editor-toolbar">
      <ColorPalette label="FG" selected={brush.fg} onSelect={onSetFg} />
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
      <button
        type="button"
        className={styles.clearButton}
        onClick={onClear}
        data-testid="clear-button"
      >
        Clear
      </button>
      <button
        type="button"
        className={styles.saveButton}
        onClick={onSave}
        data-testid="save-button"
      >
        Save
      </button>
      <button
        type="button"
        className={styles.saveButton}
        onClick={onSaveAs}
        data-testid="save-as-button"
      >
        Save As
      </button>
    </div>
  )
}
