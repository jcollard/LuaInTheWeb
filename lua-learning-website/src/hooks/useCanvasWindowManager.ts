import { useCallback, useRef, useEffect } from 'react'
import type { ScreenMode, HotReloadMode } from '@lua-learning/shell-core'
import { generateCanvasWindowHTML } from './canvasWindowTemplate'

/**
 * Reload handler info including the handler function and hot reload mode.
 */
interface ReloadHandlerInfo {
  /** Function to call when reload is requested */
  handler: () => void
  /** Hot reload mode: 'manual' (default) or 'auto' (reload on save) */
  hotReloadMode: HotReloadMode
}

/**
 * Execution control handlers for pause/play/stop/step.
 */
interface ExecutionControlHandlers {
  pause?: () => void
  play?: () => void
  stop?: () => void
  step?: () => void
}

/**
 * Control state for syncing popup window button visibility.
 */
export interface CanvasControlState {
  isRunning: boolean
  isPaused: boolean
}

/**
 * State for a single canvas popup window.
 */
interface CanvasWindowState {
  /** The popup window reference */
  window: Window
  /** The canvas element in the popup */
  canvas: HTMLCanvasElement
  /** Whether a canvas process is currently connected to this window */
  isConnected: boolean
}

/**
 * Return type for the useCanvasWindowManager hook.
 */
export interface UseCanvasWindowManagerReturn {
  /** Open a canvas in a new popup window, returns the canvas element when ready */
  openCanvasWindow: (
    canvasId: string,
    screenMode?: ScreenMode,
    noToolbar?: boolean
  ) => Promise<HTMLCanvasElement>
  /** Close a canvas popup window by ID */
  closeCanvasWindow: (canvasId: string) => void
  /** Disconnect a canvas process from a window without closing it. Shows "No canvas connected" overlay. */
  disconnectCanvasWindow: (canvasId: string) => void
  /** Close all open canvas popup windows */
  closeAllWindows: () => void
  /** Register a handler to be called when a window is closed by the user */
  registerWindowCloseHandler: (canvasId: string, handler: () => void) => void
  /** Unregister a window close handler */
  unregisterWindowCloseHandler: (canvasId: string) => void
  /** Register a handler to be called when the reload button is clicked */
  registerWindowReloadHandler: (canvasId: string, handler: () => void, hotReloadMode?: HotReloadMode) => void
  /** Unregister a window reload handler */
  unregisterWindowReloadHandler: (canvasId: string) => void
  /** Trigger auto-reload for all windows in 'auto' mode (called on Lua file save) */
  triggerAutoReload: () => void
  /** Register a handler to be called when the pause button is clicked */
  registerWindowPauseHandler: (canvasId: string, handler: () => void) => void
  /** Register a handler to be called when the play button is clicked */
  registerWindowPlayHandler: (canvasId: string, handler: () => void) => void
  /** Register a handler to be called when the stop button is clicked */
  registerWindowStopHandler: (canvasId: string, handler: () => void) => void
  /** Register a handler to be called when the step button is clicked */
  registerWindowStepHandler: (canvasId: string, handler: () => void) => void
  /** Unregister all execution control handlers for a window */
  unregisterWindowExecutionHandlers: (canvasId: string) => void
  /** Update the control state (isRunning, isPaused) in a popup window */
  updateWindowControlState: (canvasId: string, state: CanvasControlState) => void
  /** Show error overlay with error message in a popup window */
  showErrorOverlay: (canvasId: string, error: string) => void
  /** Clear/hide error overlay in a popup window */
  clearErrorOverlay: (canvasId: string) => void
}

/**
 * Hook that manages canvas popup windows.
 *
 * Responsibilities:
 * - Open popup windows with canvas elements
 * - Track open windows for cleanup
 * - Handle window close events (user clicking X)
 * - Provide close methods for programmatic closing
 */
export function useCanvasWindowManager(): UseCanvasWindowManagerReturn {
  // Map of canvasId -> window state
  const windowsRef = useRef<Map<string, CanvasWindowState>>(new Map())
  // Map of canvasId -> close handler (called when user closes window)
  const closeHandlersRef = useRef<Map<string, () => void>>(new Map())
  // Map of canvasId -> reload handler info (handler + hot reload mode)
  const reloadHandlersRef = useRef<Map<string, ReloadHandlerInfo>>(new Map())
  // Map of canvasId -> execution control handlers
  const executionHandlersRef = useRef<Map<string, ExecutionControlHandlers>>(new Map())

  /**
   * Open a canvas in a new popup window.
   * Returns a Promise that resolves with the canvas element when ready.
   * @param canvasId - Unique identifier for the canvas
   * @param screenMode - Optional screen mode (defaults to 'full')
   * @param noToolbar - If true, hides the toolbar entirely
   */
  const openCanvasWindow = useCallback(
    async (
      canvasId: string,
      screenMode?: ScreenMode,
      noToolbar?: boolean
    ): Promise<HTMLCanvasElement> => {
      // Check if we can reuse an existing window
      const existing = windowsRef.current.get(canvasId)
      if (existing && !existing.window.closed) {
        // Reuse existing window
        existing.isConnected = true

        // Clear the canvas for new use
        const ctx = existing.canvas.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, existing.canvas.width, existing.canvas.height)
        }

        // Send reconnect message to hide overlay
        existing.window.postMessage({ type: 'canvas-connected' }, '*')

        // Focus the window and canvas
        existing.window.focus()
        existing.canvas.focus()

        return existing.canvas
      }

      // Clean up stale reference if window was closed by user
      if (existing) {
        windowsRef.current.delete(canvasId)
      }

      // Open the popup window
      // Use canvas-{canvasId} as the window name so Electron can identify it
      const popup = window.open(
        '',
        `canvas-${canvasId}`,
        'width=816,height=639,resizable=yes,scrollbars=no,status=no,menubar=no,toolbar=no'
      )

      if (!popup) {
        throw new Error(
          'Failed to open popup window. Please allow popups for this site.'
        )
      }

      // Write the HTML content with the appropriate screen mode and toolbar visibility
      popup.document.write(generateCanvasWindowHTML(screenMode, noToolbar))
      popup.document.close()

      // Get the canvas element
      const canvas = popup.document.getElementById(
        'game-canvas'
      ) as HTMLCanvasElement
      if (!canvas) {
        popup.close()
        throw new Error('Failed to create canvas element in popup window.')
      }

      // Focus the canvas for input
      canvas.focus()

      // Track the window
      windowsRef.current.set(canvasId, { window: popup, canvas, isConnected: true })

      // Handle window close by user (clicking X or closing tab)
      const handleBeforeUnload = () => {
        const state = windowsRef.current.get(canvasId)
        const handler = closeHandlersRef.current.get(canvasId)
        // Only call close handler if connected (has active process to stop)
        if (state?.isConnected && handler) {
          // Call the registered close handler (this will stop the canvas process)
          handler()
        }
        // Clean up our tracking
        windowsRef.current.delete(canvasId)
        closeHandlersRef.current.delete(canvasId)
        reloadHandlersRef.current.delete(canvasId)
        executionHandlersRef.current.delete(canvasId)
      }

      popup.addEventListener('beforeunload', handleBeforeUnload)

      // Also handle pagehide for Safari compatibility
      popup.addEventListener('pagehide', handleBeforeUnload)

      // Listen for messages from the popup window
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'canvas-reload') {
          const info = reloadHandlersRef.current.get(canvasId)
          if (info) {
            info.handler()
          }
        } else if (event.data?.type === 'canvas-pause') {
          const handlers = executionHandlersRef.current.get(canvasId)
          if (handlers?.pause) {
            handlers.pause()
          }
        } else if (event.data?.type === 'canvas-play') {
          const handlers = executionHandlersRef.current.get(canvasId)
          if (handlers?.play) {
            handlers.play()
          }
        } else if (event.data?.type === 'canvas-stop') {
          const handlers = executionHandlersRef.current.get(canvasId)
          if (handlers?.stop) {
            handlers.stop()
          }
        } else if (event.data?.type === 'canvas-step') {
          const handlers = executionHandlersRef.current.get(canvasId)
          if (handlers?.step) {
            handlers.step()
          }
        }
      }
      window.addEventListener('message', handleMessage)

      // Store cleanup function reference so it can be removed when window is closed
      // We use a closure to capture the handler for cleanup later
      const originalCloseHandler = closeHandlersRef.current.get(canvasId)
      closeHandlersRef.current.set(canvasId, () => {
        window.removeEventListener('message', handleMessage)
        if (originalCloseHandler) {
          originalCloseHandler()
        }
      })

      return canvas
    },
    []
  )

  /**
   * Close a canvas popup window by ID.
   * Used when the process stops (Ctrl+C, canvas.stop(), etc).
   */
  const closeCanvasWindow = useCallback((canvasId: string) => {
    const state = windowsRef.current.get(canvasId)
    if (state) {
      try {
        state.window.close()
      } catch {
        // Window may already be closed
      }
      windowsRef.current.delete(canvasId)
      closeHandlersRef.current.delete(canvasId)
      reloadHandlersRef.current.delete(canvasId)
      executionHandlersRef.current.delete(canvasId)
    }
  }, [])

  /**
   * Disconnect a canvas process from a window without closing it.
   * The window stays open and shows "No canvas connected" overlay.
   * Used to keep the window available for reuse when the process stops.
   */
  const disconnectCanvasWindow = useCallback((canvasId: string) => {
    const state = windowsRef.current.get(canvasId)
    if (state) {
      // Mark as disconnected
      state.isConnected = false

      // Send disconnect message to popup to show overlay
      state.window.postMessage({ type: 'canvas-disconnected' }, '*')

      // Clear handlers (but keep window reference open)
      closeHandlersRef.current.delete(canvasId)
      reloadHandlersRef.current.delete(canvasId)
      executionHandlersRef.current.delete(canvasId)
    }
  }, [])

  /**
   * Close all open canvas popup windows.
   * Called on component unmount or when navigating away.
   */
  const closeAllWindows = useCallback(() => {
    for (const [canvasId, state] of windowsRef.current.entries()) {
      try {
        state.window.close()
      } catch {
        // Window may already be closed
      }
      closeHandlersRef.current.delete(canvasId)
      reloadHandlersRef.current.delete(canvasId)
      executionHandlersRef.current.delete(canvasId)
    }
    windowsRef.current.clear()
  }, [])

  /**
   * Register a handler to be called when a window is closed by the user.
   * This is used to stop the canvas process when the user closes the popup.
   */
  const registerWindowCloseHandler = useCallback((canvasId: string, handler: () => void) => {
    closeHandlersRef.current.set(canvasId, handler)
  }, [])

  /**
   * Unregister a window close handler.
   * Called when the canvas stops normally to prevent double-cleanup.
   */
  const unregisterWindowCloseHandler = useCallback((canvasId: string) => {
    closeHandlersRef.current.delete(canvasId)
  }, [])

  /**
   * Register a handler to be called when the reload button is clicked.
   * This is used to trigger hot reload from the popup window.
   * @param canvasId - Unique identifier for the canvas window
   * @param handler - Function to call when reload is requested
   * @param hotReloadMode - Hot reload mode: 'manual' (default) or 'auto' (reload on save)
   */
  const registerWindowReloadHandler = useCallback((canvasId: string, handler: () => void, hotReloadMode: HotReloadMode = 'manual') => {
    reloadHandlersRef.current.set(canvasId, { handler, hotReloadMode })
  }, [])

  /**
   * Unregister a window reload handler.
   * Called when the canvas stops.
   */
  const unregisterWindowReloadHandler = useCallback((canvasId: string) => {
    reloadHandlersRef.current.delete(canvasId)
  }, [])

  /**
   * Trigger auto-reload for all windows in 'auto' mode.
   * Called when a Lua file is saved (Ctrl+S).
   */
  const triggerAutoReload = useCallback(() => {
    for (const info of reloadHandlersRef.current.values()) {
      if (info.hotReloadMode === 'auto') {
        info.handler()
      }
    }
  }, [])

  /**
   * Register a handler for the pause button in the popup window.
   */
  const registerWindowPauseHandler = useCallback((canvasId: string, handler: () => void) => {
    const existing = executionHandlersRef.current.get(canvasId) ?? {}
    executionHandlersRef.current.set(canvasId, { ...existing, pause: handler })
  }, [])

  /**
   * Register a handler for the play button in the popup window.
   */
  const registerWindowPlayHandler = useCallback((canvasId: string, handler: () => void) => {
    const existing = executionHandlersRef.current.get(canvasId) ?? {}
    executionHandlersRef.current.set(canvasId, { ...existing, play: handler })
  }, [])

  /**
   * Register a handler for the stop button in the popup window.
   */
  const registerWindowStopHandler = useCallback((canvasId: string, handler: () => void) => {
    const existing = executionHandlersRef.current.get(canvasId) ?? {}
    executionHandlersRef.current.set(canvasId, { ...existing, stop: handler })
  }, [])

  /**
   * Register a handler for the step button in the popup window.
   */
  const registerWindowStepHandler = useCallback((canvasId: string, handler: () => void) => {
    const existing = executionHandlersRef.current.get(canvasId) ?? {}
    executionHandlersRef.current.set(canvasId, { ...existing, step: handler })
  }, [])

  /**
   * Unregister all execution control handlers for a window.
   */
  const unregisterWindowExecutionHandlers = useCallback((canvasId: string) => {
    executionHandlersRef.current.delete(canvasId)
  }, [])

  /**
   * Update the control state in a popup window.
   * Sends a message to the popup to update button visibility.
   */
  const updateWindowControlState = useCallback((canvasId: string, state: CanvasControlState) => {
    const windowState = windowsRef.current.get(canvasId)
    if (windowState) {
      windowState.window.postMessage(
        { type: 'canvas-control-state', isRunning: state.isRunning, isPaused: state.isPaused },
        '*'
      )
    }
  }, [])

  /**
   * Show error overlay with error message in a popup window.
   */
  const showErrorOverlay = useCallback((canvasId: string, error: string) => {
    const windowState = windowsRef.current.get(canvasId)
    if (windowState) {
      windowState.window.postMessage(
        { type: 'canvas-error', error },
        '*'
      )
    }
  }, [])

  /**
   * Clear/hide error overlay in a popup window.
   */
  const clearErrorOverlay = useCallback((canvasId: string) => {
    const windowState = windowsRef.current.get(canvasId)
    if (windowState) {
      windowState.window.postMessage(
        { type: 'canvas-error-clear' },
        '*'
      )
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      closeAllWindows()
    }
  }, [closeAllWindows])

  return {
    openCanvasWindow,
    closeCanvasWindow,
    disconnectCanvasWindow,
    closeAllWindows,
    registerWindowCloseHandler,
    unregisterWindowCloseHandler,
    registerWindowReloadHandler,
    unregisterWindowReloadHandler,
    triggerAutoReload,
    registerWindowPauseHandler,
    registerWindowPlayHandler,
    registerWindowStopHandler,
    registerWindowStepHandler,
    unregisterWindowExecutionHandlers,
    updateWindowControlState,
    showErrorOverlay,
    clearErrorOverlay,
  }
}
