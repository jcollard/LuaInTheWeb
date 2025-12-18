import { useState, useCallback } from 'react'

/**
 * Valid canvas scaling modes:
 * - 'fit': Scale down to fit container (never scales up beyond native size)
 * - 'full': Scale to fill container (scales up or down to fill available space)
 * - 'native': Display at native size (1x, shows scrollbars if needed)
 */
export type CanvasScalingMode = 'fit' | 'full' | 'native'

const STORAGE_KEY = 'canvas-scaling:mode'
const DEFAULT_MODE: CanvasScalingMode = 'fit'

/**
 * Validates if a value is a valid CanvasScalingMode
 */
function isValidScalingMode(value: unknown): value is CanvasScalingMode {
  return value === 'fit' || value === 'full' || value === 'native'
}

/**
 * Loads the scaling mode from localStorage
 */
function loadScalingMode(): CanvasScalingMode {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved && isValidScalingMode(saved)) {
    return saved
  }
  return DEFAULT_MODE
}

/**
 * Saves the scaling mode to localStorage
 */
function saveScalingMode(mode: CanvasScalingMode): void {
  localStorage.setItem(STORAGE_KEY, mode)
}

/**
 * Hook for managing canvas scaling mode with localStorage persistence.
 *
 * @returns Object containing current scalingMode and setScalingMode function
 */
export function useCanvasScaling() {
  const [scalingMode, setScalingModeState] = useState<CanvasScalingMode>(
    loadScalingMode
  )

  const setScalingMode = useCallback((mode: CanvasScalingMode) => {
    setScalingModeState(mode)
    saveScalingMode(mode)
  }, [])

  return {
    scalingMode,
    setScalingMode,
  }
}
