import { useState, useRef, useEffect, useCallback } from 'react'
import type { RGBColor, PaletteType } from './types'
import { PALETTES } from './types'
import { rgbEqual } from './layerUtils'
import { hsvToRgb, rgbToHex, hexToRgb } from './colorUtils'
import styles from './AnsiGraphicsEditor.module.css'

export interface ColorPanelProps {
  selectedFg: RGBColor
  selectedBg: RGBColor
  onSetFg: (color: RGBColor) => void
  onSetBg: (color: RGBColor) => void
}

const GRID_CLASS: Record<PaletteType, string> = {
  cga: styles.colorGridCga,
  ega: styles.colorGridEga,
  vga: styles.colorGridVga,
}

export function ColorPanel({ selectedFg, selectedBg, onSetFg, onSetBg }: ColorPanelProps) {
  const [paletteType, setPaletteType] = useState<PaletteType>('cga')
  const [hue, setHue] = useState(0)
  const [hexValue, setHexValue] = useState(() => rgbToHex(selectedFg))

  const svCanvasRef = useRef<HTMLCanvasElement>(null)
  const hueCanvasRef = useRef<HTMLCanvasElement>(null)

  // Update hex input when FG changes externally
  useEffect(() => {
    setHexValue(rgbToHex(selectedFg))
  }, [selectedFg])

  // Draw SV gradient
  useEffect(() => {
    const canvas = svCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width
    const h = canvas.height
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        const s = x / (w - 1)
        const v = 1 - y / (h - 1)
        const [r, g, b] = hsvToRgb(hue, s, v)
        ctx.fillStyle = `rgb(${r},${g},${b})`
        ctx.fillRect(x, y, 1, 1)
      }
    }
  }, [hue])

  // Draw hue bar
  useEffect(() => {
    const canvas = hueCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const h = canvas.height
    for (let y = 0; y < h; y++) {
      const hueVal = (y / (h - 1)) * 360
      const [r, g, b] = hsvToRgb(hueVal, 1, 1)
      ctx.fillStyle = `rgb(${r},${g},${b})`
      ctx.fillRect(0, y, canvas.width, 1)
    }
  }, [])

  const handleSvClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const s = Math.max(0, Math.min(1, x / (canvas.width - 1)))
    const v = Math.max(0, Math.min(1, 1 - y / (canvas.height - 1)))
    const color = hsvToRgb(hue, s, v)
    if (e.button === 2) {
      e.preventDefault()
      onSetBg(color)
    } else {
      onSetFg(color)
    }
  }, [hue, onSetFg, onSetBg])

  const handleSvContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = e.currentTarget
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const s = Math.max(0, Math.min(1, x / (canvas.width - 1)))
    const v = Math.max(0, Math.min(1, 1 - y / (canvas.height - 1)))
    const color = hsvToRgb(hue, s, v)
    onSetBg(color)
  }, [hue, onSetBg])

  const handleHueClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget
    const rect = canvas.getBoundingClientRect()
    const y = e.clientY - rect.top
    setHue(Math.max(0, Math.min(360, (y / (canvas.height - 1)) * 360)))
  }, [])

  const handleApplyFg = useCallback(() => {
    const rgb = hexToRgb(hexValue)
    if (rgb) onSetFg(rgb)
  }, [hexValue, onSetFg])

  const handleApplyBg = useCallback(() => {
    const rgb = hexToRgb(hexValue)
    if (rgb) onSetBg(rgb)
  }, [hexValue, onSetBg])

  const palette = PALETTES[paletteType]

  return (
    <div className={styles.colorPanel} data-testid="color-panel">
      <header className={styles.colorPanelHeader}>
        <span className={styles.colorPanelTitle}>Colors</span>
      </header>
      <div className={styles.paletteSelectorRow}>
        {(['cga', 'ega', 'vga'] as PaletteType[]).map(pt => (
          <button
            key={pt}
            type="button"
            className={`${styles.paletteSelectorBtn} ${paletteType === pt ? styles.paletteSelectorBtnActive : ''}`}
            aria-pressed={paletteType === pt}
            onClick={() => setPaletteType(pt)}
            data-testid={`palette-btn-${pt}`}
          >
            {pt.toUpperCase()}
          </button>
        ))}
      </div>
      <div
        className={`${styles.colorGrid} ${GRID_CLASS[paletteType]}`}
        data-testid="color-grid"
      >
        {palette.map((entry, i) => {
          const isFg = rgbEqual(selectedFg, entry.rgb)
          const isBg = rgbEqual(selectedBg, entry.rgb)
          return (
            <button
              key={`${paletteType}-${i}`}
              type="button"
              className={`${styles.colorSwatch} ${isFg ? styles.swatchFgSelected : ''} ${isBg ? styles.swatchBgSelected : ''}`}
              style={{ backgroundColor: `rgb(${entry.rgb[0]},${entry.rgb[1]},${entry.rgb[2]})` }}
              title={entry.name}
              aria-label={entry.name}
              onClick={() => onSetFg(entry.rgb)}
              onContextMenu={(e) => { e.preventDefault(); onSetBg(entry.rgb) }}
              {...(isFg ? { 'data-fg-selected': 'true' } : {})}
              {...(isBg ? { 'data-bg-selected': 'true' } : {})}
            />
          )
        })}
      </div>
      <div className={styles.customPickerSection}>
        <div className={styles.customPickerCanvases}>
          <canvas
            ref={svCanvasRef}
            className={styles.svGradient}
            width={150}
            height={100}
            data-testid="sv-gradient"
            onClick={handleSvClick}
            onContextMenu={handleSvContextMenu}
          />
          <canvas
            ref={hueCanvasRef}
            className={styles.hueBar}
            width={20}
            height={100}
            data-testid="hue-bar"
            onClick={handleHueClick}
          />
        </div>
        <div className={styles.hexInputRow}>
          <input
            type="text"
            className={styles.hexInput}
            value={hexValue}
            onChange={(e) => setHexValue(e.target.value)}
            data-testid="hex-input"
            maxLength={7}
          />
          <button
            type="button"
            className={styles.hexApplyBtn}
            onClick={handleApplyFg}
            data-testid="apply-fg-btn"
            title="Set as foreground"
          >
            FG
          </button>
          <button
            type="button"
            className={styles.hexApplyBtn}
            onClick={handleApplyBg}
            data-testid="apply-bg-btn"
            title="Set as background"
          >
            BG
          </button>
        </div>
      </div>
    </div>
  )
}
