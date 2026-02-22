import { useState } from 'react'
import type { ReactElement } from 'react'
import { CHAR_PALETTE_CATEGORIES } from './charPaletteData'
import styles from './AnsiGraphicsEditor.module.css'

export interface CharPaletteModalProps {
  anchorRect?: DOMRect
  onSelect: (char: string) => void
  onClose: () => void
}

export function CharPaletteModal({ anchorRect, onSelect, onClose }: CharPaletteModalProps): ReactElement {
  const [activeTab, setActiveTab] = useState('ascii')
  const activeCategory = CHAR_PALETTE_CATEGORIES.find(c => c.id === activeTab)!

  function handleCharClick(char: string): void {
    onSelect(char)
    onClose()
  }

  return (
    <>
      <div className={styles.pickerBackdrop} onClick={onClose} data-testid="char-palette-backdrop" />
      <div
        className={styles.pickerPopover}
        style={anchorRect ? { top: anchorRect.top, left: anchorRect.right + 8 } : undefined}
        data-testid="char-palette-modal"
      >
        <header className={styles.pickerModalHeader}>
          <span>Character Palette</span>
          <button type="button" className={styles.pickerModalClose} onClick={onClose} data-testid="char-palette-close">
            ✕
          </button>
        </header>
        <div className={styles.charPaletteTabs}>
          {CHAR_PALETTE_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              type="button"
              className={`${styles.paletteSelectorBtn} ${activeTab === cat.id ? styles.paletteSelectorBtnActive : ''}`}
              onClick={() => setActiveTab(cat.id)}
              data-testid={`char-tab-${cat.id}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className={styles.charPaletteBody}>
          <div className={styles.charGrid}>
            {activeCategory.chars.map(charEntry => (
              <button
                key={charEntry.char}
                type="button"
                className={styles.charCell}
                title={charEntry.name}
                onClick={() => handleCharClick(charEntry.char)}
                data-testid="char-cell"
              >
                {charEntry.char}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
