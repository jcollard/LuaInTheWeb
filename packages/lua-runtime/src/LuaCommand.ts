/**
 * Lua command implementing ICommand interface.
 * Provides `lua` command for interactive REPL or script execution.
 */

import type { ICommand, IProcess, ShellContext } from '@lua-learning/shell-core'
import { LuaReplProcess, type LuaReplProcessOptions } from './LuaReplProcess'
import { LuaScriptProcess } from './LuaScriptProcess'
import { LuaLinter } from './LuaLinter'

/**
 * Canvas display mode.
 * - 'tab': Display canvas in editor tab (default)
 * - 'window': Display canvas in popup window
 */
export type CanvasMode = 'tab' | 'window'

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
 * Parsed options from lua command arguments.
 */
interface ParsedLuaOptions {
  canvasMode: CanvasMode
  screenMode: ScreenMode
  noToolbar: boolean
  hotReloadMode: HotReloadMode
  startScreen: boolean
  filename: string | null
  lint: boolean
}

/**
 * Default execution control options.
 * Prompts user after 1M lines (~0.5-1 second) to continue or stop.
 * Uses window.confirm() which is synchronous and works within the blocked JS thread.
 */
const DEFAULT_EXECUTION_OPTIONS = {
  instructionLimit: 1_000_000, // 1M lines before prompting
  onInstructionLimitReached: () => {
    // confirm() is synchronous - pauses execution and waits for user response
    return confirm('Script has been running for a while. Continue execution?')
  },
} satisfies LuaReplProcessOptions

/**
 * Command that starts a Lua REPL or executes a Lua script.
 *
 * Usage:
 * - `lua` - Start interactive Lua REPL
 * - `lua <filename>` - Execute a Lua script file
 * - `lua --lint <filename>` - Check syntax of a Lua file
 * - `lua --canvas=window <filename>` - Execute script with canvas in popup window
 */
export class LuaCommand implements ICommand {
  /**
   * Command name.
   */
  readonly name = 'lua'

  /**
   * Command description.
   */
  readonly description = 'Execute Lua code interactively or run a script file'

  /**
   * Usage pattern.
   */
  readonly usage = 'lua [--lint] [--canvas=tab|window] [--screen=1x|fit|full] [--no-toolbar] [--hot-reload=manual|auto] [--start-screen] [filename]'

  /**
   * Parse command arguments into structured options.
   * @param args - Raw command arguments
   * @returns Parsed options including canvasMode, screenMode, filename, and lint flag
   */
  private parseArgs(args: string[]): ParsedLuaOptions {
    let canvasMode: CanvasMode = 'tab'
    let screenMode: ScreenMode = undefined
    let noToolbar = false
    let hotReloadMode: HotReloadMode = 'manual'
    let startScreen = false
    let filename: string | null = null
    let lint = false

    for (const arg of args) {
      if (arg === '--lint') {
        lint = true
      } else if (arg === '--no-toolbar') {
        noToolbar = true
      } else if (arg === '--start-screen') {
        startScreen = true
      } else if (arg.startsWith('--canvas=')) {
        const mode = arg.slice('--canvas='.length)
        if (mode === 'tab' || mode === 'window') {
          canvasMode = mode
        }
        // Invalid values are silently ignored, defaulting to 'tab'
      } else if (arg.startsWith('--screen=')) {
        const mode = arg.slice('--screen='.length)
        if (mode === '1x' || mode === 'fit' || mode === 'full') {
          screenMode = mode
        }
        // Invalid values are silently ignored, keeping undefined (shows toolbar)
      } else if (arg.startsWith('--hot-reload=')) {
        const mode = arg.slice('--hot-reload='.length)
        if (mode === 'manual' || mode === 'auto') {
          hotReloadMode = mode
        }
        // Invalid values are silently ignored, defaulting to 'manual'
      } else if (!arg.startsWith('-')) {
        // First non-flag argument is the filename
        if (filename === null) {
          filename = arg
        }
      }
    }

    return { canvasMode, screenMode, noToolbar, hotReloadMode, startScreen, filename, lint }
  }

  /**
   * Execute the command.
   * @param args - Command arguments. If empty, starts REPL. If filename provided, executes script.
   * @param context - Shell execution context
   * @returns IProcess for the Lua execution, or undefined for --lint
   */
  execute(args: string[], context: ShellContext): IProcess | undefined {
    const { canvasMode, screenMode, noToolbar, hotReloadMode, startScreen, filename, lint } = this.parseArgs(args)

    // Handle --lint flag
    if (lint) {
      return this.executeLint(filename ? [filename] : [], context)
    }

    // Determine script directory for asset resolution
    // For scripts: use the directory containing the script file
    // For REPL: use the current working directory
    const scriptDirectory = filename
      ? this.getScriptDirectory(filename, context.cwd)
      : context.cwd

    // Build canvas callbacks if available in context
    // CanvasCallbacks requires onRequestCanvasTab and onCloseCanvasTab
    // We can only create canvasCallbacks if these are present
    const canvasCallbacks =
      context.onRequestCanvasTab && context.onCloseCanvasTab
        ? {
            onRequestCanvasTab: context.onRequestCanvasTab,
            onCloseCanvasTab: context.onCloseCanvasTab,
            // Canvas window callbacks for popup mode
            onRequestCanvasWindow: context.onRequestCanvasWindow,
            onCloseCanvasWindow: context.onCloseCanvasWindow,
            // Canvas close handler registration for UI-initiated tab close
            registerCanvasCloseHandler: context.registerCanvasCloseHandler,
            unregisterCanvasCloseHandler: context.unregisterCanvasCloseHandler,
            // Canvas reload handler registration for UI-triggered hot reload (tabs)
            registerCanvasReloadHandler: context.registerCanvasReloadHandler,
            unregisterCanvasReloadHandler: context.unregisterCanvasReloadHandler,
            // Window reload handler registration for UI-triggered hot reload (popup windows)
            registerWindowReloadHandler: context.registerWindowReloadHandler,
            unregisterWindowReloadHandler: context.unregisterWindowReloadHandler,
            // Window close handler registration for UI-initiated popup window close
            registerWindowCloseHandler: context.registerWindowCloseHandler,
            unregisterWindowCloseHandler: context.unregisterWindowCloseHandler,
            // Window execution control handlers (pause/play/stop/step)
            registerWindowPauseHandler: context.registerWindowPauseHandler,
            registerWindowPlayHandler: context.registerWindowPlayHandler,
            registerWindowStopHandler: context.registerWindowStopHandler,
            registerWindowStepHandler: context.registerWindowStepHandler,
            unregisterWindowExecutionHandlers: context.unregisterWindowExecutionHandlers,
            updateWindowControlState: context.updateWindowControlState,
            // Error overlay for canvas windows
            showErrorOverlay: context.showErrorOverlay,
            clearErrorOverlay: context.clearErrorOverlay,
            // Font transfer for canvas windows (popup windows have isolated document.fonts)
            transferFontsToWindow: context.transferFontsToWindow,
            // Canvas tab execution control handlers (pause/play/stop/step)
            registerCanvasPauseHandler: context.registerCanvasPauseHandler,
            registerCanvasPlayHandler: context.registerCanvasPlayHandler,
            registerCanvasStopHandler: context.registerCanvasStopHandler,
            registerCanvasStepHandler: context.registerCanvasStepHandler,
            unregisterCanvasExecutionHandlers: context.unregisterCanvasExecutionHandlers,
            updateCanvasControlState: context.updateCanvasControlState,
            fileSystem: context.filesystem,
            scriptDirectory,
          }
        : undefined

    if (!filename) {
      // No arguments - start interactive REPL with canvas support and file I/O
      // REPL always uses tab mode (canvasMode is ignored for REPL)
      return new LuaReplProcess({
        ...DEFAULT_EXECUTION_OPTIONS,
        canvasCallbacks,
        fileSystem: context.filesystem,
        cwd: context.cwd,
        onFileSystemChange: context.onFileSystemChange,
      })
    }

    // Build ANSI callbacks if available in context
    const ansiCallbacks =
      context.onRequestAnsiTab && context.onCloseAnsiTab
        ? {
            onRequestAnsiTab: context.onRequestAnsiTab,
            onCloseAnsiTab: context.onCloseAnsiTab,
            registerAnsiCloseHandler: context.registerAnsiCloseHandler,
            unregisterAnsiCloseHandler: context.unregisterAnsiCloseHandler,
          }
        : undefined

    // Build options, including canvas callbacks, mode, screen mode, toolbar visibility, hot reload mode, and start screen
    const options = {
      ...DEFAULT_EXECUTION_OPTIONS,
      canvasCallbacks,
      canvasMode,
      screenMode,
      noToolbar,
      hotReloadMode,
      startScreen,
      ansiCallbacks,
    }

    return new LuaScriptProcess(filename, context, options)
  }

  /**
   * Extract the directory path from a script filename.
   * Handles both absolute and relative paths.
   *
   * @param filename - The script filename (absolute or relative)
   * @param cwd - The current working directory
   * @returns The directory containing the script
   */
  private getScriptDirectory(filename: string, cwd: string): string {
    // Resolve the full path if relative
    let fullPath = filename
    if (!filename.startsWith('/')) {
      // Relative path - resolve against cwd
      fullPath = cwd === '/' ? `/${filename}` : `${cwd}/${filename}`
    }

    // Extract directory (everything before the last /)
    const lastSlash = fullPath.lastIndexOf('/')
    if (lastSlash <= 0) {
      return '/'
    }
    return fullPath.substring(0, lastSlash)
  }

  /**
   * Execute the --lint command to check syntax of a Lua file.
   * @param args - Remaining arguments after --lint (should be [filename])
   * @param context - Shell execution context
   * @returns undefined (lint is synchronous, outputs directly to context)
   */
  private executeLint(args: string[], context: ShellContext): undefined {
    if (args.length === 0) {
      context.error('lua --lint requires a filename')
      return undefined
    }

    const filename = args[0]
    const cwd = context.filesystem.getCurrentDirectory()

    // Resolve path (absolute or relative to cwd)
    const fullPath = filename.startsWith('/') ? filename : `${cwd}/${filename}`

    // Check if file exists
    if (!context.filesystem.exists(fullPath)) {
      context.error(`${filename}: file not found`)
      return undefined
    }

    // Read file content
    const content = context.filesystem.readFile(fullPath)

    // Lint the code using luaparse
    const result = LuaLinter.lint(content)

    if (!result.valid && result.error) {
      // Format error message: filename:line:column: message
      const location = result.error.line
        ? `:${result.error.line}${result.error.column ? `:${result.error.column}` : ''}`
        : ''
      context.error(`${filename}${location}: ${result.error.message}`)
    }

    return undefined
  }
}
