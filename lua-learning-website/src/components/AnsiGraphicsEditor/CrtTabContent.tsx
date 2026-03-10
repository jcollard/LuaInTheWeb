import { useRef } from 'react'
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

function migrateAndMerge(parsed: Record<string, unknown>): CrtConfig {
  for (const [oldKey, newKey] of Object.entries(KEY_MIGRATIONS)) {
    if (oldKey in parsed && !(newKey in parsed)) {
      parsed[newKey] = parsed[oldKey]
      delete parsed[oldKey]
    }
  }
  return { ...CRT_DEFAULTS, ...parsed } as CrtConfig
}

function loadSavedConfig(): CrtConfig {
  try {
    const raw = localStorage.getItem(CRT_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      return migrateAndMerge(parsed)
    }
  } catch { /* invalid JSON — fall through */ }
  return { ...CRT_DEFAULTS }
}

function saveConfig(config: CrtConfig): void {
  localStorage.setItem(CRT_STORAGE_KEY, JSON.stringify(config))
}

export interface CrtTabContentProps {
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

function formatSliderValue(key: NumericCrtKey, value: number): string {
  if (key === 'scanlineCount') return String(value)
  if (key === 'curvature' || key === 'flickerStrength') return value.toFixed(3)
  return value.toFixed(2)
}

export function CrtTabContent({ crtConfig, onSetCrtConfig }: CrtTabContentProps) {
  const enabled = crtConfig !== null
  const config = crtConfig ?? CRT_DEFAULTS
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  function handleExport(): void {
    const json = JSON.stringify(config, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'crt-config.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImportClick(): void {
    fileInputRef.current?.click()
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(reader.result as string)
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return
        const migrated = migrateAndMerge(parsed as Record<string, unknown>)
        saveConfig(migrated)
        onSetCrtConfig(migrated)
      } catch { /* invalid JSON — ignore */ }
    }
    reader.readAsText(file)
    // Reset so the same file can be re-imported
    e.target.value = ''
  }

  return (
    <div className={styles.crtTabContent} data-testid="crt-tab-content">
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
            {formatSliderValue(key, config[key])}
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
      <button
        type="button"
        className={styles.fileOptionsAction}
        onClick={handleExport}
        disabled={!enabled}
        data-testid="crt-export-btn"
      >
        Export Config
      </button>
      <button
        type="button"
        className={styles.fileOptionsAction}
        onClick={handleImportClick}
        data-testid="crt-import-btn"
      >
        Import Config
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelected}
        data-testid="crt-import-input"
        style={{ display: 'none' }}
      />
    </div>
  )
}
