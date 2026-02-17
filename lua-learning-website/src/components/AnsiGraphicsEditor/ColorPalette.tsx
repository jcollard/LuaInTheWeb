import type { RGBColor } from './types'
import { CGA_PALETTE } from './types'
import styles from './AnsiGraphicsEditor.module.css'

export interface ColorPaletteProps {
  label: string
  selected: RGBColor
  onSelect: (color: RGBColor) => void
}

function colorsEqual(a: RGBColor, b: RGBColor): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]
}

export function ColorPalette({ label, selected, onSelect }: ColorPaletteProps) {
  return (
    <div className={styles.paletteGroup}>
      <span className={styles.paletteLabel}>{label}</span>
      <div className={styles.paletteGrid} data-testid={`palette-${label.toLowerCase()}`}>
        {CGA_PALETTE.map((entry) => {
          const isSelected = colorsEqual(selected, entry.rgb)
          return (
            <button
              key={entry.name}
              type="button"
              className={`${styles.paletteSwatch} ${isSelected ? styles.paletteSwatchSelected : ''}`}
              style={{ backgroundColor: `rgb(${entry.rgb[0]},${entry.rgb[1]},${entry.rgb[2]})` }}
              title={entry.name}
              aria-label={`${label}: ${entry.name}`}
              aria-pressed={isSelected}
              onClick={() => onSelect(entry.rgb)}
            />
          )
        })}
      </div>
    </div>
  )
}
