import { useState, useCallback } from 'react'

/**
 * Valid canvas scaling modes
 */
export type CanvasScalingMode = 'fit' | 'native'

const STORAGE_KEY = 'canvas-scaling:mode'
const DEFAULT_MODE: CanvasScalingMode = 'fit'

/**
 * Validates if a value is a valid CanvasScalingMode
 */
function isValidScalingMode(value: unknown): value is CanvasScalingMode {
  return value === 'fit' || value === 'native'
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
