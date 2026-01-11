/**
 * Shell execution context provided to commands.
 * Contains the environment and I/O handlers for command execution.
 */

import type { IFileSystem } from '../types'

/**
 * Screen mode for canvas popup windows.
 * Controls scaling behavior and toolbar visibility.
 * - '1x': Native resolution, no scaling
 * - 'fit': Scale to fit while maintaining aspect ratio
 * - 'full': Scale to fill the entire window
 * - undefined: Show toolbar with default 'full' scaling
 */
export type ScreenMode = '1x' | 'fit' | 'full' | undefined

/**
 * Hot reload mode for canvas popup windows.
 * Controls whether the canvas automatically reloads when Lua files are saved.
 * - 'manual': User must click Reload button (default)
 * - 'auto': Automatically reload when any .lua file is saved
 */
export type HotReloadMode = 'manual' | 'auto'

/**
 * Context provided to shell commands during execution.
 * Encapsulates the execution environment including filesystem access
 * and output handling.
 */
export interface ShellContext {
  /**
   * Current working directory path.
   */
  cwd: string

  /**
   * Filesystem for file operations.
   */
  filesystem: IFileSystem

  /**
   * Write standard output.
   * @param text - Text to output
   */
  output: (text: string) => void

  /**
   * Write standard error.
   * @param text - Error text to output
   */
  error: (text: string) => void

  /**
   * Request a canvas tab to be opened.
   * Returns the canvas element when the tab is ready.
   * @param canvasId - Unique identifier for the canvas tab
   * @returns Promise resolving to the HTMLCanvasElement when ready
   */
  onRequestCanvasTab?: (canvasId: string) => Promise<HTMLCanvasElement>

  /**
   * Request a canvas tab to be closed.
   * @param canvasId - Unique identifier for the canvas tab to close
   */
  onCloseCanvasTab?: (canvasId: string) => void

  /**
   * Request a canvas window to be opened (popup instead of tab).
   * Returns the canvas element when the window is ready.
   * Used when `lua --canvas=window` is specified.
   * @param canvasId - Unique identifier for the canvas window
   * @param screenMode - Optional screen mode for scaling
   * @param noToolbar - If true, hide the toolbar entirely
   * @returns Promise resolving to the HTMLCanvasElement when ready
   */
  onRequestCanvasWindow?: (
    canvasId: string,
    screenMode?: ScreenMode,
    noToolbar?: boolean
  ) => Promise<HTMLCanvasElement>

  /**
   * Request a canvas window to be closed.
   * @param canvasId - Unique identifier for the canvas window to close
   */
  onCloseCanvasWindow?: (canvasId: string) => void

  /**
   * Register a handler to be called when the canvas tab is closed from the UI.
   * This allows the canvas process to be stopped when the user closes the tab manually.
   * @param canvasId - Unique identifier for the canvas tab
   * @param handler - Function to call when the tab is closed
   */
  registerCanvasCloseHandler?: (canvasId: string, handler: () => void) => void

  /**
   * Unregister the close handler for a canvas.
   * Called when the canvas stops normally to prevent double-cleanup.
   * @param canvasId - Unique identifier for the canvas tab
   */
  unregisterCanvasCloseHandler?: (canvasId: string) => void

  /**
   * Register a handler to reload the canvas (hot reload modules).
   * Called when canvas starts, providing a function the UI can call to trigger reload.
   * @param canvasId - Unique identifier for the canvas tab
   * @param handler - Function to call when reload is requested
   */
  registerCanvasReloadHandler?: (canvasId: string, handler: () => void) => void

  /**
   * Unregister the reload handler for a canvas.
   * Called when the canvas stops.
   * @param canvasId - Unique identifier for the canvas tab
   */
  unregisterCanvasReloadHandler?: (canvasId: string) => void

  /**
   * Register a handler to reload the canvas from a popup window.
   * Called when canvas starts in window mode.
   * @param canvasId - Unique identifier for the canvas window
   * @param handler - Function to call when reload is requested
   * @param hotReloadMode - Hot reload mode: 'manual' (default) or 'auto' (reload on save)
   */
  registerWindowReloadHandler?: (canvasId: string, handler: () => void, hotReloadMode?: HotReloadMode) => void

  /**
   * Unregister the window reload handler.
   * Called when the canvas stops.
   * @param canvasId - Unique identifier for the canvas window
   */
  unregisterWindowReloadHandler?: (canvasId: string) => void

  /**
   * Register a handler to be called when a popup window is closed by the user.
   * Called when canvas starts in window mode.
   * @param canvasId - Unique identifier for the canvas window
   * @param handler - Function to call when the window is closed
   */
  registerWindowCloseHandler?: (canvasId: string, handler: () => void) => void

  /**
   * Unregister the window close handler.
   * Called when the canvas stops.
   * @param canvasId - Unique identifier for the canvas window
   */
  unregisterWindowCloseHandler?: (canvasId: string) => void

  /**
   * Register a handler for the pause button in a popup window.
   * @param canvasId - Unique identifier for the canvas window
   * @param handler - Function to call when pause is requested
   */
  registerWindowPauseHandler?: (canvasId: string, handler: () => void) => void

  /**
   * Register a handler for the play button in a popup window.
   * @param canvasId - Unique identifier for the canvas window
   * @param handler - Function to call when play is requested
   */
  registerWindowPlayHandler?: (canvasId: string, handler: () => void) => void

  /**
   * Register a handler for the stop button in a popup window.
   * @param canvasId - Unique identifier for the canvas window
   * @param handler - Function to call when stop is requested
   */
  registerWindowStopHandler?: (canvasId: string, handler: () => void) => void

  /**
   * Register a handler for the step button in a popup window.
   * @param canvasId - Unique identifier for the canvas window
   * @param handler - Function to call when step is requested
   */
  registerWindowStepHandler?: (canvasId: string, handler: () => void) => void

  /**
   * Unregister all execution control handlers for a popup window.
   * @param canvasId - Unique identifier for the canvas window
   */
  unregisterWindowExecutionHandlers?: (canvasId: string) => void

  /**
   * Update the control state (isRunning, isPaused) in a popup window.
   * @param canvasId - Unique identifier for the canvas window
   * @param state - The current control state
   */
  updateWindowControlState?: (canvasId: string, state: { isRunning: boolean; isPaused: boolean }) => void

  /**
   * Register a handler for the pause button in a canvas tab.
   * @param canvasId - Unique identifier for the canvas tab
   * @param handler - Function to call when pause is requested
   */
  registerCanvasPauseHandler?: (canvasId: string, handler: () => void) => void

  /**
   * Register a handler for the play button in a canvas tab.
   * @param canvasId - Unique identifier for the canvas tab
   * @param handler - Function to call when play is requested
   */
  registerCanvasPlayHandler?: (canvasId: string, handler: () => void) => void

  /**
   * Register a handler for the stop button in a canvas tab.
   * @param canvasId - Unique identifier for the canvas tab
   * @param handler - Function to call when stop is requested
   */
  registerCanvasStopHandler?: (canvasId: string, handler: () => void) => void

  /**
   * Register a handler for the step button in a canvas tab.
   * @param canvasId - Unique identifier for the canvas tab
   * @param handler - Function to call when step is requested
   */
  registerCanvasStepHandler?: (canvasId: string, handler: () => void) => void

  /**
   * Unregister all execution control handlers for a canvas tab.
   * @param canvasId - Unique identifier for the canvas tab
   */
  unregisterCanvasExecutionHandlers?: (canvasId: string) => void

  /**
   * Update the control state (isRunning, isPaused) in a canvas tab.
   * @param canvasId - Unique identifier for the canvas tab
   * @param state - The current control state
   */
  updateCanvasControlState?: (canvasId: string, state: { isRunning: boolean; isPaused: boolean }) => void

  /**
   * Show error overlay in a canvas window.
   * @param canvasId - Unique identifier for the canvas window
   * @param error - Error message to display
   */
  showErrorOverlay?: (canvasId: string, error: string) => void

  /**
   * Clear/hide error overlay in a canvas window.
   * @param canvasId - Unique identifier for the canvas window
   */
  clearErrorOverlay?: (canvasId: string) => void

  /**
   * Request a file to be opened in the editor.
   * Called by the 'open' command to integrate with an IDE or editor.
   * Optional - when undefined, the open command will report that
   * editor integration is not available.
   * @param filePath - Absolute path to the file to open
   */
  onRequestOpenFile?: (filePath: string) => void

  /**
   * Notify that the filesystem has changed.
   * Called after file operations (create, write, delete) to refresh UI.
   * Optional - when undefined, no notification is sent.
   */
  onFileSystemChange?: () => Promise<void> | void

  /**
   * Trigger a file download to the user's browser.
   * Called by export command to save the generated ZIP file.
   * @param filename - Suggested filename for the download
   * @param blob - The file data as a Blob
   */
  onTriggerDownload?: (filename: string, blob: Blob) => void
}
