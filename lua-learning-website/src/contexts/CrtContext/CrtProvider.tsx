import { useState, useCallback, type ReactNode } from 'react'
import { CrtContext } from './context'
import type { CrtSettings, CrtContextValue } from './types'

const STORAGE_KEY = 'lua-ide-crt'
const DEFAULT_SETTINGS: CrtSettings = { enabled: false, intensity: 0.7 }

function getStoredSettings(): CrtSettings | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    const parsed = JSON.parse(stored) as CrtSettings
    if (typeof parsed.enabled !== 'boolean' || typeof parsed.intensity !== 'number') {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function saveSettings(settings: CrtSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // localStorage not available
  }
}

interface CrtProviderProps {
  children: ReactNode
}

export function CrtProvider({ children }: CrtProviderProps) {
  const [settings, setSettings] = useState<CrtSettings>(
    () => getStoredSettings() ?? DEFAULT_SETTINGS,
  )

  const toggleCrt = useCallback(() => {
    setSettings(current => {
      const next = { ...current, enabled: !current.enabled }
      saveSettings(next)
      return next
    })
  }, [])

  const setIntensity = useCallback((intensity: number) => {
    const clamped = Math.min(1, Math.max(0, intensity))
    setSettings(current => {
      const next = { ...current, intensity: clamped }
      saveSettings(next)
      return next
    })
  }, [])

  const value: CrtContextValue = {
    enabled: settings.enabled,
    intensity: settings.intensity,
    toggleCrt,
    setIntensity,
  }

  return (
    <CrtContext.Provider value={value}>
      {children}
    </CrtContext.Provider>
  )
}
