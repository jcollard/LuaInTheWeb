import type { KeyboardEvent } from 'react'
import { CRT_DEFAULTS, type CrtConfig } from '@lua-learning/lua-runtime'
import styles from './AnsiGraphicsEditor.module.css'

export const CRT_STORAGE_KEY = 'ansi-crt-config'

function loadSavedConfig(): CrtConfig {
  try {
    const raw = localStorage.getItem(CRT_STORAGE_KEY)
    if (raw) return JSON.parse(raw) as CrtConfig
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

interface SliderDef {
  key: keyof CrtConfig
  label: string
  min: number
  max: number
  step: number
}

const SLIDERS: SliderDef[] = [
  { key: 'curvature', label: 'Curvature', min: 0, max: 0.5, step: 0.005 },
  { key: 'scanlines', label: 'Scanlines', min: 0, max: 1, step: 0.01 },
  { key: 'bloom', label: 'Bloom', min: 0, max: 1, step: 0.01 },
  { key: 'vignette', label: 'Vignette', min: 0, max: 1, step: 0.01 },
  { key: 'chromatic', label: 'Chromatic', min: 0, max: 1, step: 0.01 },
  { key: 'flicker', label: 'Flicker', min: 0, max: 0.15, step: 0.001 },
  { key: 'brightness', label: 'Brightness', min: 0.6, max: 1.8, step: 0.01 },
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

  function handleSliderChange(key: keyof CrtConfig, value: number): void {
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
          {SLIDERS.map(({ key, label, min, max, step }) => (
            <label key={key} className={styles.fileOptionsAction}>
              {label}
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={config[key]}
                onChange={e => handleSliderChange(key, Number(e.target.value))}
                disabled={!enabled}
                data-testid={`crt-slider-${key}`}
                style={{ flex: 1 }}
              />
              <span data-testid={`crt-value-${key}`} style={{ minWidth: '3em', textAlign: 'right' }}>
                {config[key].toFixed(key === 'curvature' || key === 'flicker' ? 3 : 2)}
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
