import { useCallback, useRef, useEffect } from 'react'
import type { ScreenMode } from '@lua-learning/shell-core'

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
  openCanvasWindow: (
    canvasId: string,
    screenMode?: ScreenMode
  ) => Promise<HTMLCanvasElement>
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
 * Generate HTML content for the canvas popup window.
 * Creates a page with optional toolbar and canvas with scaling support.
 * @param screenMode - If set, hides toolbar and locks to that scaling mode
 */
function generateCanvasWindowHTML(screenMode?: ScreenMode): string {
  // Determine initial scale mode and toolbar visibility
  const showToolbar = screenMode === undefined
  const initialMode = screenMode ?? 'full'
  // Map screen mode to CSS class name
  const scaleClass =
    initialMode === '1x' ? 'scale-native' : `scale-${initialMode}`

  return `
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
      display: flex;
      flex-direction: column;
    }

    /* Toolbar styling */
    .toolbar {
      background: #2d2d44;
      padding: 6px 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 1px solid #3d3d5c;
      flex-shrink: 0;
    }
    .toolbar.hidden {
      display: none;
    }
    .toolbar label {
      color: #a0a0b0;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
    }
    .toolbar select {
      background: #1a1a2e;
      color: #e0e0e0;
      border: 1px solid #3d3d5c;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 13px;
      font-family: system-ui, -apple-system, sans-serif;
      cursor: pointer;
    }
    .toolbar select:hover {
      border-color: #5d5d7c;
    }
    .toolbar select:focus {
      outline: none;
      border-color: #6d6d8c;
    }

    /* Canvas container */
    .canvas-container {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;
      overflow: hidden;
    }

    /* Scaling modes */
    .canvas-container.scale-fit canvas {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .canvas-container.scale-full canvas {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .canvas-container.scale-native {
      overflow: auto;
      justify-content: flex-start;
      align-items: flex-start;
    }
    .canvas-container.scale-native canvas {
      /* Native size - no scaling */
    }

    canvas {
      display: block;
      background: #000;
    }
  </style>
</head>
<body>
  <div id="toolbar" class="toolbar${showToolbar ? '' : ' hidden'}">
    <label for="scale-select">Scale:</label>
    <select id="scale-select">
      <option value="fit"${initialMode === 'fit' ? ' selected' : ''}>Fit</option>
      <option value="full"${initialMode === 'full' ? ' selected' : ''}>Full</option>
      <option value="native"${initialMode === '1x' ? ' selected' : ''}>1x</option>
    </select>
  </div>
  <div id="canvas-container" class="canvas-container ${scaleClass}">
    <canvas id="game-canvas" width="800" height="600" tabindex="0"></canvas>
  </div>
  <script>
    (function() {
      var select = document.getElementById('scale-select');
      var container = document.getElementById('canvas-container');

      if (select) {
        select.addEventListener('change', function() {
          // Remove all scale classes
          container.classList.remove('scale-fit', 'scale-full', 'scale-native');
          // Add the selected scale class
          var mode = select.value;
          container.classList.add('scale-' + mode);
        });
      }
    })();
  </script>
</body>
</html>
`
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

  /**
   * Open a canvas in a new popup window.
   * Returns a Promise that resolves with the canvas element when ready.
   * @param canvasId - Unique identifier for the canvas
   * @param screenMode - Optional screen mode (undefined shows toolbar, defaults to 'full')
   */
  const openCanvasWindow = useCallback(
    async (
      canvasId: string,
      screenMode?: ScreenMode
    ): Promise<HTMLCanvasElement> => {
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
        throw new Error(
          'Failed to open popup window. Please allow popups for this site.'
        )
      }

      // Write the HTML content with the appropriate screen mode
      popup.document.write(generateCanvasWindowHTML(screenMode))
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
