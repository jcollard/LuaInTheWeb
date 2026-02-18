import { useState, useMemo, useCallback } from 'react'
import type { RGBColor, PaletteEntry } from './types'
import { simplifyPalette } from './colorUtils'
import styles from './AnsiGraphicsEditor.module.css'

export interface SimplifyPaletteModalProps {
  palette: PaletteEntry[]
  scope: 'current' | 'layer'
  onApply: (mapping: Map<string, RGBColor>, scope: 'current' | 'layer') => void
  onClose: () => void
}

export function SimplifyPaletteModal({ palette, scope, onApply, onClose }: SimplifyPaletteModalProps) {
  const [targetCount, setTargetCount] = useState(() =>
    Math.max(1, Math.floor(palette.length / 2)),
  )

  const simplifyResult = useMemo(
    () => simplifyPalette(palette, targetCount),
    [palette, targetCount],
  )

  const handleApply = useCallback(() => {
    onApply(simplifyResult.mapping, scope)
    onClose()
  }, [simplifyResult, onApply, scope, onClose])

  return (
    <>
      <div className={styles.pickerBackdrop} onClick={onClose} />
      <div className={styles.pickerPopover} data-testid="simplify-modal">
        <header className={styles.pickerModalHeader}>
          <span>Simplify Palette</span>
          <button type="button" className={styles.pickerModalClose} onClick={onClose}>
            ✕
          </button>
        </header>
        <div className={styles.simplifyBody}>
          <div className={styles.simplifyInfo}>
            Current: {palette.length} colors
          </div>
          <div className={styles.simplifySliderRow}>
            <span>Target:</span>
            <input
              type="range"
              min={1}
              max={palette.length - 1}
              value={targetCount}
              onChange={(e) => setTargetCount(Number(e.target.value))}
              data-testid="simplify-slider"
            />
            <span>{targetCount}</span>
          </div>
          <div
            className={`${styles.colorGrid} ${styles.colorGridEga} ${styles.simplifyPreview}`}
            data-testid="simplify-preview"
          >
            {simplifyResult.reduced.map((entry, i) => (
              <div
                key={i}
                className={styles.colorSwatch}
                style={{ backgroundColor: `rgb(${entry.rgb[0]},${entry.rgb[1]},${entry.rgb[2]})` }}
                title={entry.name}
              />
            ))}
          </div>
        </div>
        <button
          type="button"
          className={styles.simplifyApplyBtn}
          onClick={handleApply}
          data-testid="simplify-apply-btn"
        >
          Apply
        </button>
      </div>
    </>
  )
}
