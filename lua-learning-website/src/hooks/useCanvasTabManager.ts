import { useCallback, useRef } from 'react'
import type { TabInfo, TabType } from '../components/TabBar/types'

/**
 * Props for the useCanvasTabManager hook
 */
export interface UseCanvasTabManagerProps {
  /** Current code in the editor */
  code: string
  /** All open tabs */
  tabs: TabInfo[]
  /** Currently active tab path */
  activeTab: string | null
  /** Type of the active tab */
  activeTabType: TabType | null
  /** Function to open a canvas tab */
  openCanvasTab: (id: string, name?: string) => void
}

/**
 * Return type for the useCanvasTabManager hook
 */
export interface UseCanvasTabManagerReturn {
  /** Handler to run the current code in a canvas tab */
  handleRunCanvas: () => void
  /** Handler for canvas process exit */
  handleCanvasExit: (exitCode: number) => void
  /** Whether any canvas tabs exist */
  hasCanvasTabs: boolean
  /** Code for the current/last active canvas tab */
  canvasCode: string
}

/**
 * Hook that manages canvas tab state and lifecycle.
 * Extracts canvas-related logic from IDELayout to reduce complexity.
 *
 * Responsibilities:
 * - Store code for each canvas tab
 * - Track the last active canvas tab (for background running)
 * - Provide handlers for running canvas and handling exit
 * - Compute derived state (hasCanvasTabs, canvasCode)
 */
export function useCanvasTabManager({
  code,
  tabs,
  activeTab,
  activeTabType,
  openCanvasTab,
}: UseCanvasTabManagerProps): UseCanvasTabManagerReturn {
  // Store canvas code for each canvas tab (by tab path)
  const canvasCodesRef = useRef<Map<string, string>>(new Map())
  // Track the last active canvas tab to keep it running in background
  const lastActiveCanvasTabRef = useRef<string | null>(null)

  // Track the last active canvas tab to keep canvas running when switching to file tabs
  if (activeTab && activeTabType === 'canvas') {
    lastActiveCanvasTabRef.current = activeTab
  }

  // Run the current code in a canvas tab
  const handleRunCanvas = useCallback(() => {
    if (!code.trim()) return

    // Generate a unique ID for the canvas tab
    const canvasId = `canvas-${Date.now()}`
    const tabPath = `canvas://${canvasId}`

    // Store the code for this canvas tab
    canvasCodesRef.current.set(tabPath, code)

    // Open the canvas tab
    openCanvasTab(canvasId, 'Canvas')
  }, [code, openCanvasTab])

  // Handle canvas process exit - keep tab open so user can see final state
  // Tab will be closed when user clicks the close button
  const handleCanvasExit = useCallback((_exitCode: number) => {
    // Process finished but we don't auto-close - user may want to see result
  }, [])

  // Check if there are any canvas tabs (to know if we should render CanvasTabContent)
  const hasCanvasTabs = tabs.some(t => t.type === 'canvas')

  // Get the code for the canvas - use active canvas tab or last active canvas tab
  const canvasTabPath = activeTabType === 'canvas' ? activeTab : lastActiveCanvasTabRef.current
  const canvasCode = canvasTabPath ? canvasCodesRef.current.get(canvasTabPath) ?? '' : ''

  return {
    handleRunCanvas,
    handleCanvasExit,
    hasCanvasTabs,
    canvasCode,
  }
}
