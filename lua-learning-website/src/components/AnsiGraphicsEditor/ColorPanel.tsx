import { Fragment, useState, useRef, useEffect, useCallback, useMemo } from 'react'
import type { RGBColor, PaletteEntry, PaletteType, StaticPaletteType, Layer } from './types'
import { PALETTES, isDrawableLayer } from './types'
import { rgbEqual } from './layerUtils'
import { hsvToRgb, rgbToHsv, rgbToHex, hexToRgb, rgbStyle, extractGridColors, extractAllLayerColors } from './colorUtils'
import { SimplifyPaletteModal } from './SimplifyPaletteModal'
import styles from './AnsiGraphicsEditor.module.css'

export interface ColorPanelProps {
  selectedFg: RGBColor
  selectedBg: RGBColor
  onSetFg: (color: RGBColor) => void
  onSetBg: (color: RGBColor) => void
  onSimplifyColors: (mapping: Map<string, RGBColor>, scope: 'current' | 'layer') => void
  layers: Layer[]
  activeLayerId: string
}

type PickerTarget = 'fg' | 'bg'

const ALL_PALETTE_TYPES: PaletteType[] = ['cga', 'ega', 'vga', 'current', 'layer']

const TAB_LABELS: Record<PaletteType, string> = {
  cga: 'CGA',
  ega: 'EGA',
  vga: 'VGA',
  current: 'Current',
  layer: 'Layer',
}

const STATIC_GRID_CLASS: Record<StaticPaletteType, string> = {
  cga: styles.colorGridCga,
  ega: styles.colorGridEga,
  vga: styles.colorGridVga,
}

function isDynamicPalette(type: PaletteType): type is 'current' | 'layer' {
  return type === 'current' || type === 'layer'
}

function resolvePalette(
  type: PaletteType,
  currentPalette: PaletteEntry[],
  layerPalette: PaletteEntry[],
): PaletteEntry[] {
  if (type === 'current') return currentPalette
  if (type === 'layer') return layerPalette
  return PALETTES[type]
}

function resolveGridClass(type: PaletteType, paletteLength: number): string {
  if (isDynamicPalette(type)) {
    return paletteLength <= 64 ? styles.colorGridEga : styles.colorGridVga
  }
  return STATIC_GRID_CLASS[type]
}

function colorAtPosition(canvas: HTMLCanvasElement, hue: number, clientX: number, clientY: number): RGBColor {
  const rect = canvas.getBoundingClientRect()
  const x = clientX - rect.left
  const y = clientY - rect.top
  const s = Math.max(0, Math.min(1, x / (canvas.width - 1)))
  const v = Math.max(0, Math.min(1, 1 - y / (canvas.height - 1)))
  return hsvToRgb(hue, s, v)
}

function strokeWithContrast(
  ctx: CanvasRenderingContext2D,
  drawPath: () => void,
  outerWidth: number,
): void {
  drawPath()
  ctx.strokeStyle = '#000'
  ctx.lineWidth = outerWidth
  ctx.stroke()
  drawPath()
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 1
  ctx.stroke()
}

function drawSvGradient(canvas: HTMLCanvasElement | null, hue: number, marker?: { s: number; v: number }) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = canvas.width
  const h = canvas.height
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      const s = x / (w - 1)
      const v = 1 - y / (h - 1)
      ctx.fillStyle = rgbStyle(hsvToRgb(hue, s, v))
      ctx.fillRect(x, y, 1, 1)
    }
  }
  if (marker) {
    const mx = marker.s * (w - 1)
    const my = (1 - marker.v) * (h - 1)
    strokeWithContrast(ctx, () => { ctx.beginPath(); ctx.arc(mx, my, 5, 0, Math.PI * 2) }, 2)
  }
}

function hueFromCanvasY(canvas: HTMLCanvasElement, clientY: number): number {
  const rect = canvas.getBoundingClientRect()
  const y = clientY - rect.top
  return Math.max(0, Math.min(360, (y / (canvas.height - 1)) * 360))
}

function drawHueBar(canvas: HTMLCanvasElement | null, markerHue?: number) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const h = canvas.height
  for (let y = 0; y < h; y++) {
    const hueVal = (y / (h - 1)) * 360
    ctx.fillStyle = rgbStyle(hsvToRgb(hueVal, 1, 1))
    ctx.fillRect(0, y, canvas.width, 1)
  }
  if (markerHue !== undefined) {
    const my = (markerHue / 360) * (h - 1)
    strokeWithContrast(ctx, () => { ctx.beginPath(); ctx.moveTo(0, my); ctx.lineTo(canvas.width, my) }, 3)
  }
}

export function ColorPanel({ selectedFg, selectedBg, onSetFg, onSetBg, onSimplifyColors, layers, activeLayerId }: ColorPanelProps) {
  const [paletteType, setPaletteType] = useState<PaletteType>('cga')
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null)

  // Dynamic palette computation
  const currentPalette = useMemo(() => extractAllLayerColors(layers), [layers])
  const activeLayer = layers.find(l => l.id === activeLayerId)
  const layerPalette = useMemo(() => activeLayer && isDrawableLayer(activeLayer) ? extractGridColors(activeLayer.grid) : [], [activeLayer])

  const palette = resolvePalette(paletteType, currentPalette, layerPalette)
  const gridClass = resolveGridClass(paletteType, palette.length)

  // Simplify palette state
  const [simplifyOpen, setSimplifyOpen] = useState(false)
  const showSimplifyBtn = isDynamicPalette(paletteType) && palette.length > 1

  // Inline picker state
  const [hue, setHue] = useState(0)
  const [svDragging, setSvDragging] = useState<'left' | 'right' | null>(null)
  const [hueDragging, setHueDragging] = useState(false)
  const svCanvasRef = useRef<HTMLCanvasElement>(null)
  const hueCanvasRef = useRef<HTMLCanvasElement>(null)
  const hueRef = useRef(hue)
  hueRef.current = hue

  // Modal picker state
  const [modalHue, setModalHue] = useState(0)
  const [modalSvDragging, setModalSvDragging] = useState(false)
  const [modalHueDragging, setModalHueDragging] = useState(false)
  const [hexValue, setHexValue] = useState('')
  const modalSvRef = useRef<HTMLCanvasElement>(null)
  const modalHueRef = useRef<HTMLCanvasElement>(null)
  const fgBgSectionRef = useRef<HTMLDivElement>(null)
  const modalHueValRef = useRef(modalHue)
  modalHueValRef.current = modalHue

  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({})

  const openPicker = useCallback((target: PickerTarget) => {
    const color = target === 'fg' ? selectedFg : selectedBg
    const [h] = rgbToHsv(color[0], color[1], color[2])
    setModalHue(h)
    setHexValue(rgbToHex(color))
    if (fgBgSectionRef.current) {
      const rect = fgBgSectionRef.current.getBoundingClientRect()
      setPopoverStyle({
        bottom: window.innerHeight - rect.top + 4,
        left: rect.left,
        width: rect.width,
      })
    }
    setPickerTarget(target)
  }, [selectedFg, selectedBg])

  const closePicker = useCallback(() => {
    setPickerTarget(null)
  }, [])

  const modalApply = pickerTarget === 'fg' ? onSetFg : onSetBg

  const adjustBrightness = useCallback((target: 'fg' | 'bg', delta: number) => {
    const color = target === 'fg' ? selectedFg : selectedBg
    const setter = target === 'fg' ? onSetFg : onSetBg
    const [h, s, v] = rgbToHsv(color[0], color[1], color[2])
    setter(hsvToRgb(h, s, Math.max(0, Math.min(1, v + delta))))
  }, [selectedFg, selectedBg, onSetFg, onSetBg])

  // --- Inline picker drawing ---
  useEffect(() => {
    const [, s, v] = rgbToHsv(selectedFg[0], selectedFg[1], selectedFg[2])
    drawSvGradient(svCanvasRef.current, hue, { s, v })
  }, [hue, selectedFg])
  useEffect(() => { drawHueBar(hueCanvasRef.current, hue) }, [hue])

  // --- Modal picker drawing ---
  useEffect(() => {
    if (pickerTarget === null) return
    const color = pickerTarget === 'fg' ? selectedFg : selectedBg
    const [, s, v] = rgbToHsv(color[0], color[1], color[2])
    drawSvGradient(modalSvRef.current, modalHue, { s, v })
  }, [modalHue, pickerTarget, selectedFg, selectedBg])

  useEffect(() => {
    if (pickerTarget === null) return
    drawHueBar(modalHueRef.current, modalHue)
  }, [pickerTarget, modalHue])

  // --- Inline SV: mousedown + drag ---
  const handleSvMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget
    const color = colorAtPosition(canvas, hueRef.current, e.clientX, e.clientY)
    if (e.button === 2) {
      e.preventDefault()
      onSetBg(color)
      setSvDragging('right')
    } else {
      onSetFg(color)
      setSvDragging('left')
    }
  }, [onSetFg, onSetBg])

  useEffect(() => {
    if (!svDragging) return
    const setter = svDragging === 'left' ? onSetFg : onSetBg
    const onMove = (e: MouseEvent) => {
      const canvas = svCanvasRef.current
      if (!canvas) return
      setter(colorAtPosition(canvas, hueRef.current, e.clientX, e.clientY))
    }
    const onUp = () => setSvDragging(null)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [svDragging, onSetFg, onSetBg])

  // --- Inline hue bar: mousedown + drag ---
  const handleHueMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setHue(hueFromCanvasY(e.currentTarget, e.clientY))
    setHueDragging(true)
  }, [])

  useEffect(() => {
    if (!hueDragging) return
    const onMove = (e: MouseEvent) => {
      const canvas = hueCanvasRef.current
      if (!canvas) return
      setHue(hueFromCanvasY(canvas, e.clientY))
    }
    const onUp = () => setHueDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [hueDragging])

  // --- Modal SV: mousedown + drag (always applies to target) ---
  const handleModalSvMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = e.currentTarget
    const color = colorAtPosition(canvas, modalHueValRef.current, e.clientX, e.clientY)
    modalApply(color)
    setHexValue(rgbToHex(color))
    setModalSvDragging(true)
  }, [modalApply])

  useEffect(() => {
    if (!modalSvDragging) return
    const onMove = (e: MouseEvent) => {
      const canvas = modalSvRef.current
      if (!canvas) return
      const color = colorAtPosition(canvas, modalHueValRef.current, e.clientX, e.clientY)
      modalApply(color)
      setHexValue(rgbToHex(color))
    }
    const onUp = () => setModalSvDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [modalSvDragging, modalApply])

  // --- Modal hue bar: mousedown + drag ---
  const handleModalHueMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setModalHue(hueFromCanvasY(e.currentTarget, e.clientY))
    setModalHueDragging(true)
  }, [])

  useEffect(() => {
    if (!modalHueDragging) return
    const onMove = (e: MouseEvent) => {
      const canvas = modalHueRef.current
      if (!canvas) return
      setModalHue(hueFromCanvasY(canvas, e.clientY))
    }
    const onUp = () => setModalHueDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [modalHueDragging])

  const handleHexApply = useCallback(() => {
    const rgb = hexToRgb(hexValue)
    if (rgb) modalApply(rgb)
  }, [hexValue, modalApply])

  return (
    <div className={styles.colorPanel} data-testid="color-panel">
      <header className={styles.colorPanelHeader}>
        <span className={styles.colorPanelTitle}>Colors</span>
      </header>
      <div className={styles.paletteSelectorRow}>
        {ALL_PALETTE_TYPES.map(pt => (
          <button
            key={pt}
            type="button"
            className={`${styles.paletteSelectorBtn} ${paletteType === pt ? styles.paletteSelectorBtnActive : ''}`}
            aria-pressed={paletteType === pt}
            onClick={() => setPaletteType(pt)}
            data-testid={`palette-btn-${pt}`}
          >
            {TAB_LABELS[pt]}
          </button>
        ))}
      </div>
      {showSimplifyBtn && (
        <div className={styles.simplifyRow}>
          <button
            type="button"
            className={styles.simplifyBtn}
            onClick={() => setSimplifyOpen(true)}
            data-testid="simplify-btn"
          >
            Simplify Palette
          </button>
        </div>
      )}
      {simplifyOpen && (
        <SimplifyPaletteModal
          palette={palette}
          scope={paletteType as 'current' | 'layer'}
          onApply={onSimplifyColors}
          onClose={() => setSimplifyOpen(false)}
        />
      )}
      <div
        className={`${styles.colorGrid} ${gridClass}`}
        data-testid="color-grid"
      >
        {palette.length === 0 && isDynamicPalette(paletteType) ? (
          <div className={styles.emptyPalette} data-testid="empty-palette">No colors in use</div>
        ) : palette.map((entry, i) => {
          const isFg = rgbEqual(selectedFg, entry.rgb)
          const isBg = rgbEqual(selectedBg, entry.rgb)
          return (
            <button
              key={`${paletteType}-${i}`}
              type="button"
              className={`${styles.colorSwatch} ${isFg ? styles.swatchFgSelected : ''} ${isBg ? styles.swatchBgSelected : ''}`}
              style={{ backgroundColor: rgbStyle(entry.rgb) }}
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
            onMouseDown={handleSvMouseDown}
            onContextMenu={(e) => e.preventDefault()}
          />
          <canvas
            ref={hueCanvasRef}
            className={styles.hueBar}
            width={20}
            height={100}
            data-testid="hue-bar"
            onMouseDown={handleHueMouseDown}
          />
        </div>
      </div>
      {pickerTarget !== null && (
        <>
          <div className={styles.pickerBackdrop} data-testid="picker-backdrop" onClick={closePicker} />
          <div className={styles.pickerPopover} data-testid="color-picker-modal" style={popoverStyle}>
            <header className={styles.pickerModalHeader}>
              <span>{pickerTarget === 'fg' ? 'Foreground' : 'Background'} Color</span>
              <button
                type="button"
                className={styles.pickerModalClose}
                onClick={closePicker}
                data-testid="picker-close-btn"
              >
                ✕
              </button>
            </header>
            <div className={styles.customPickerCanvases}>
              <canvas
                ref={modalSvRef}
                className={styles.svGradient}
                width={200}
                height={150}
                data-testid="modal-sv-gradient"
                onMouseDown={handleModalSvMouseDown}
                onContextMenu={(e) => e.preventDefault()}
              />
              <canvas
                ref={modalHueRef}
                className={styles.hueBar}
                width={20}
                height={150}
                data-testid="modal-hue-bar"
                onMouseDown={handleModalHueMouseDown}
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
                onClick={handleHexApply}
                data-testid="hex-apply-btn"
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}
      <div className={styles.fgBgButtonSection} ref={fgBgSectionRef}>
        {([
          { target: 'fg' as const, label: 'FG', fullLabel: 'Foreground', color: selectedFg },
          { target: 'bg' as const, label: 'BG', fullLabel: 'Background', color: selectedBg },
        ]).map(({ target, label, fullLabel, color }) => (
          <Fragment key={target}>
            <button
              type="button"
              className={styles.fgBgButton}
              style={{ backgroundColor: rgbStyle(color) }}
              onClick={() => openPicker(target)}
              data-testid={`${target}-color-btn`}
              title={`${fullLabel} color`}
            >
              {label}
            </button>
            <div className={styles.brightnessRow} data-testid={`${target}-brightness-row`}>
              <span className={styles.brightnessLabel}>Brightness</span>
              <button type="button" className={styles.brightnessBtn} onClick={() => adjustBrightness(target, -0.01)} data-testid={`${target}-darken-btn`} title={`Darken ${fullLabel.toLowerCase()}`}>−</button>
              <button type="button" className={styles.brightnessBtn} onClick={() => adjustBrightness(target, 0.01)} data-testid={`${target}-lighten-btn`} title={`Lighten ${fullLabel.toLowerCase()}`}>+</button>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  )
}
