import { Fragment, useState, useMemo } from 'react'
import type { RGBColor, PaletteType, StaticPaletteType, Layer } from './types'
import { isDrawableLayer } from './types'
import { rgbEqual } from './layerUtils'
import { rgbStyle, extractGridColors, extractAllLayerColors } from './colorUtils'
import { isDynamicPalette, resolvePalette } from './colorPanelUtils'
import { SimplifyPaletteModal } from './SimplifyPaletteModal'
import { useColorPicker } from './useColorPicker'
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

function resolveGridClass(type: PaletteType, paletteLength: number): string {
  if (isDynamicPalette(type)) {
    return paletteLength <= 64 ? styles.colorGridEga : styles.colorGridVga
  }
  return STATIC_GRID_CLASS[type]
}

export function ColorPanel({ selectedFg, selectedBg, onSetFg, onSetBg, onSimplifyColors, layers, activeLayerId }: ColorPanelProps) {
  const [paletteType, setPaletteType] = useState<PaletteType>('cga')

  // Dynamic palette computation
  const currentPalette = useMemo(() => extractAllLayerColors(layers), [layers])
  const activeLayer = layers.find(l => l.id === activeLayerId)
  const layerPalette = useMemo(() => activeLayer && isDrawableLayer(activeLayer) ? extractGridColors(activeLayer.grid) : [], [activeLayer])

  const palette = resolvePalette(paletteType, currentPalette, layerPalette)
  const gridClass = resolveGridClass(paletteType, palette.length)

  // Simplify palette state
  const [simplifyOpen, setSimplifyOpen] = useState(false)
  const showSimplifyBtn = isDynamicPalette(paletteType) && palette.length > 1

  const {
    svCanvasRef,
    hueCanvasRef,
    handleSvMouseDown,
    handleHueMouseDown,
    pickerTarget,
    hexValue,
    setHexValue,
    modalSvRef,
    modalHueRef,
    fgBgSectionRef,
    popoverStyle,
    openPicker,
    closePicker,
    handleModalSvMouseDown,
    handleModalHueMouseDown,
    handleHexApply,
    adjustBrightness,
  } = useColorPicker(selectedFg, selectedBg, onSetFg, onSetBg)

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
          { target: 'fg' as PickerTarget, label: 'FG', fullLabel: 'Foreground', color: selectedFg },
          { target: 'bg' as PickerTarget, label: 'BG', fullLabel: 'Background', color: selectedBg },
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
