import { useMemo, useState } from 'react'
import type { ReactElement } from 'react'
import { getFontCoverage } from '@lua-learning/lua-runtime'
import { CHAR_PALETTE_CATEGORIES, findCategoryForChar } from './charPaletteData'
import styles from './AnsiGraphicsEditor.module.css'

export interface CharPaletteModalProps {
  anchorRect?: DOMRect
  currentChar?: string
  /** Active font id — used to filter the palette to glyphs the renderer can paint. */
  fontId?: string
  onSelect: (char: string) => void
  onClose: () => void
}

export function CharPaletteModal({ anchorRect, currentChar, fontId, onSelect, onClose }: CharPaletteModalProps): ReactElement {
  const [activeTab, setActiveTab] = useState(() => findCategoryForChar(currentChar ?? '') ?? 'ascii')
  // Filter each category by what the active font can render. Categories
  // with no covered glyphs are still shown so the user can see the
  // section exists; the body just renders empty.
  const filteredCategories = useMemo(() => {
    if (!fontId) return CHAR_PALETTE_CATEGORIES
    const cov = getFontCoverage(fontId)
    return CHAR_PALETTE_CATEGORIES.map(cat => ({
      ...cat,
      chars: cat.chars.filter(e => cov.has(e.char.codePointAt(0) ?? -1)),
    }))
  }, [fontId])
  const activeCategory = filteredCategories.find(c => c.id === activeTab)
    ?? filteredCategories[0]!

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
          {filteredCategories.map(cat => (
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
            {activeCategory.chars.map(charEntry => {
              const isSelected = charEntry.char === currentChar
              return (
                <button
                  key={charEntry.char}
                  type="button"
                  className={`${styles.charCell}${isSelected ? ` ${styles.charCellSelected}` : ''}`}
                  title={charEntry.name}
                  onClick={() => handleCharClick(charEntry.char)}
                  data-testid="char-cell"
                  aria-pressed={isSelected || undefined}
                >
                  {charEntry.char}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
