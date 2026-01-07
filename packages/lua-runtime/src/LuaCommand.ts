/**
 * Lua command implementing ICommand interface.
 * Provides `lua` command for interactive REPL or script execution.
 */

import type { ICommand, IProcess, ShellContext } from '@lua-learning/shell-core'
import { LuaReplProcess, type LuaReplProcessOptions } from './LuaReplProcess'
import { LuaScriptProcess } from './LuaScriptProcess'
import { LuaLinter } from './LuaLinter'

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
  readonly usage = 'lua [--lint] [filename]'

  /**
   * Execute the command.
   * @param args - Command arguments. If empty, starts REPL. If filename provided, executes script.
   * @param context - Shell execution context
   * @returns IProcess for the Lua execution, or undefined for --lint
   */
  execute(args: string[], context: ShellContext): IProcess | undefined {
    // Handle --lint flag
    if (args[0] === '--lint') {
      return this.executeLint(args.slice(1), context)
    }

    // Filename provided - execute script
    const filename = args.length > 0 ? args[0] : null

    // Determine script directory for asset resolution
    // For scripts: use the directory containing the script file
    // For REPL: use the current working directory
    const scriptDirectory = filename
      ? this.getScriptDirectory(filename, context.cwd)
      : context.cwd

    // Build canvas callbacks if available in context
    // Include filesystem for asset loading support
    const canvasCallbacks = context.onRequestCanvasTab && context.onCloseCanvasTab
      ? {
          onRequestCanvasTab: context.onRequestCanvasTab,
          onCloseCanvasTab: context.onCloseCanvasTab,
          // Canvas close handler registration for UI-initiated tab close
          registerCanvasCloseHandler: context.registerCanvasCloseHandler,
          unregisterCanvasCloseHandler: context.unregisterCanvasCloseHandler,
          // Canvas reload handler registration for UI-triggered hot reload
          registerCanvasReloadHandler: context.registerCanvasReloadHandler,
          unregisterCanvasReloadHandler: context.unregisterCanvasReloadHandler,
          fileSystem: context.filesystem,
          scriptDirectory,
        }
      : undefined

    if (!filename) {
      // No arguments - start interactive REPL with canvas support and file I/O
      return new LuaReplProcess({
        ...DEFAULT_EXECUTION_OPTIONS,
        canvasCallbacks,
        fileSystem: context.filesystem,
        cwd: context.cwd,
        onFileSystemChange: context.onFileSystemChange,
      })
    }

    // Build options, including canvas callbacks if available
    const options = {
      ...DEFAULT_EXECUTION_OPTIONS,
      canvasCallbacks,
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
