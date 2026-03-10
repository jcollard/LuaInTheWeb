import type { KeyboardEvent } from 'react'
import { CRT_DEFAULTS, type CrtConfig } from '@lua-learning/lua-runtime'
import styles from './AnsiGraphicsEditor.module.css'

export const CRT_STORAGE_KEY = 'ansi-crt-config'

/** Migrate old localStorage keys to new gingerbeardman-aligned names. */
const KEY_MIGRATIONS: Record<string, keyof CrtConfig> = {
  scanlines: 'scanlineIntensity',
  vignette: 'vignetteStrength',
  bloom: 'bloomIntensity',
  chromatic: 'rgbShift',
  flicker: 'flickerStrength',
}

function loadSavedConfig(): CrtConfig {
  try {
    const raw = localStorage.getItem(CRT_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, number>
      for (const [oldKey, newKey] of Object.entries(KEY_MIGRATIONS)) {
        if (oldKey in parsed && !(newKey in parsed)) {
          parsed[newKey] = parsed[oldKey]
          delete parsed[oldKey]
        }
      }
      return { ...CRT_DEFAULTS, ...parsed } as CrtConfig
    }
  } catch { /* invalid JSON — fall through */ }
  return { ...CRT_DEFAULTS }
}

function saveConfig(config: CrtConfig): void {
  localStorage.setItem(CRT_STORAGE_KEY, JSON.stringify(config))
}

export interface CrtOptionsModalProps {
  onClose: () => void
  crtConfig: CrtConfig | null
  onSetCrtConfig: (config: CrtConfig | null) => void
}

type NumericCrtKey = { [K in keyof CrtConfig]: CrtConfig[K] extends number ? K : never }[keyof CrtConfig]

interface SliderDef {
  key: NumericCrtKey
  label: string
  min: number
  max: number
  step: number
}

const SLIDERS: SliderDef[] = [
  // Scanlines
  { key: 'scanlineIntensity', label: 'Intensity', min: 0, max: 1, step: 0.01 },
  { key: 'scanlineCount', label: 'Count', min: 50, max: 1200, step: 1 },
  { key: 'adaptiveIntensity', label: 'Adaptive', min: 0, max: 1, step: 0.01 },
  // Color
  { key: 'brightness', label: 'Brightness', min: 0.6, max: 1.8, step: 0.01 },
  { key: 'contrast', label: 'Contrast', min: 0.6, max: 1.8, step: 0.01 },
  { key: 'saturation', label: 'Saturation', min: 0, max: 2, step: 0.01 },
  // Bloom
  { key: 'bloomIntensity', label: 'Bloom', min: 0, max: 1.5, step: 0.01 },
  { key: 'bloomThreshold', label: 'Threshold', min: 0, max: 1, step: 0.01 },
  { key: 'rgbShift', label: 'RGB Shift', min: 0, max: 1, step: 0.01 },
  // Framing
  { key: 'vignetteStrength', label: 'Vignette', min: 0, max: 2, step: 0.01 },
  { key: 'curvature', label: 'Curvature', min: 0, max: 0.5, step: 0.005 },
  { key: 'flickerStrength', label: 'Flicker', min: 0, max: 0.15, step: 0.001 },
  // Our addition
  { key: 'phosphor', label: 'Phosphor', min: 0, max: 1, step: 0.01 },
]

export function CrtOptionsModal({ onClose, crtConfig, onSetCrtConfig }: CrtOptionsModalProps) {
  const enabled = crtConfig !== null
  const config = crtConfig ?? CRT_DEFAULTS

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }

  function handleToggle(): void {
    if (enabled) {
      saveConfig(config)
      onSetCrtConfig(null)
    } else {
      const restored = loadSavedConfig()
      onSetCrtConfig(restored)
    }
  }

  function handleChange(key: keyof CrtConfig, value: number | boolean): void {
    const updated = { ...config, [key]: value }
    saveConfig(updated)
    onSetCrtConfig(updated)
  }

  function handleReset(): void {
    const defaults = { ...CRT_DEFAULTS }
    saveConfig(defaults)
    onSetCrtConfig(defaults)
  }

  return (
    <div
      className={styles.fileOptionsOverlay}
      data-testid="crt-options-overlay"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={styles.fileOptionsDialog}
        onKeyDown={handleKeyDown}
        onClick={e => e.stopPropagation()}
        tabIndex={-1}
      >
        <div className={styles.fileOptionsHeader}>
          <span className={styles.fileOptionsTitle}>CRT Options</span>
          <button
            type="button"
            className={styles.fileOptionsClose}
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className={styles.fileOptionsBody}>
          <label className={styles.fileOptionsAction}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={handleToggle}
              data-testid="crt-enabled-checkbox"
            />
            Enable CRT
          </label>
          <label className={styles.fileOptionsAction}>
            <input
              type="checkbox"
              checked={config.smoothing}
              onChange={() => handleChange('smoothing', !config.smoothing)}
              disabled={!enabled}
              data-testid="crt-smoothing-checkbox"
            />
            Smoothing
          </label>
          {SLIDERS.map(({ key, label, min, max, step }) => (
            <label key={key} className={styles.fileOptionsAction}>
              {label}
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={config[key]}
                onChange={e => handleChange(key, Number(e.target.value))}
                disabled={!enabled}
                data-testid={`crt-slider-${key}`}
                style={{ flex: 1 }}
              />
              <span data-testid={`crt-value-${key}`} style={{ minWidth: '3em', textAlign: 'right' }}>
                {key === 'scanlineCount' ? config[key] : config[key].toFixed(key === 'curvature' || key === 'flickerStrength' ? 3 : 2)}
              </span>
            </label>
          ))}
          <button
            type="button"
            className={styles.fileOptionsAction}
            onClick={handleReset}
            disabled={!enabled}
            data-testid="crt-reset-defaults"
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  )
}
