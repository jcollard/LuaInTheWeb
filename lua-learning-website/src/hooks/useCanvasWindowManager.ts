import { useCallback, useRef, useEffect } from 'react'

/**
 * State for a single canvas popup window.
 */
interface CanvasWindowState {
  /** The popup window reference */
  window: Window
  /** The canvas element in the popup */
  canvas: HTMLCanvasElement
}

/**
 * Return type for the useCanvasWindowManager hook.
 */
export interface UseCanvasWindowManagerReturn {
  /** Open a canvas in a new popup window, returns the canvas element when ready */
  openCanvasWindow: (canvasId: string) => Promise<HTMLCanvasElement>
  /** Close a canvas popup window by ID */
  closeCanvasWindow: (canvasId: string) => void
  /** Close all open canvas popup windows */
  closeAllWindows: () => void
  /** Register a handler to be called when a window is closed by the user */
  registerWindowCloseHandler: (canvasId: string, handler: () => void) => void
  /** Unregister a window close handler */
  unregisterWindowCloseHandler: (canvasId: string) => void
}

/**
 * HTML content for the canvas popup window.
 * Creates a minimal page with a centered canvas element.
 */
const CANVAS_WINDOW_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Canvas Game</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      background: #1a1a2e;
      overflow: hidden;
    }
    body {
      display: flex;
      justify-content: center;
      align-items: center;
    }
    canvas {
      max-width: 100%;
      max-height: 100%;
      display: block;
    }
  </style>
</head>
<body>
  <canvas id="game-canvas" width="800" height="600" tabindex="0"></canvas>
</body>
</html>
`

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

  /**
   * Open a canvas in a new popup window.
   * Returns a Promise that resolves with the canvas element when ready.
   */
  const openCanvasWindow = useCallback(async (canvasId: string): Promise<HTMLCanvasElement> => {
    // Close existing window with same ID if any
    const existing = windowsRef.current.get(canvasId)
    if (existing) {
      try {
        existing.window.close()
      } catch {
        // Window may already be closed
      }
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
      throw new Error('Failed to open popup window. Please allow popups for this site.')
    }

    // Write the HTML content
    popup.document.write(CANVAS_WINDOW_HTML)
    popup.document.close()

    // Get the canvas element
    const canvas = popup.document.getElementById('game-canvas') as HTMLCanvasElement
    if (!canvas) {
      popup.close()
      throw new Error('Failed to create canvas element in popup window.')
    }

    // Focus the canvas for input
    canvas.focus()

    // Track the window
    windowsRef.current.set(canvasId, { window: popup, canvas })

    // Handle window close by user (clicking X or closing tab)
    const handleBeforeUnload = () => {
      const handler = closeHandlersRef.current.get(canvasId)
      if (handler) {
        // Call the registered close handler (this will stop the canvas process)
        handler()
      }
      // Clean up our tracking
      windowsRef.current.delete(canvasId)
      closeHandlersRef.current.delete(canvasId)
    }

    popup.addEventListener('beforeunload', handleBeforeUnload)

    // Also handle pagehide for Safari compatibility
    popup.addEventListener('pagehide', handleBeforeUnload)

    return canvas
  }, [])

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      closeAllWindows()
    }
  }, [closeAllWindows])

  return {
    openCanvasWindow,
    closeCanvasWindow,
    closeAllWindows,
    registerWindowCloseHandler,
    unregisterWindowCloseHandler,
  }
}
