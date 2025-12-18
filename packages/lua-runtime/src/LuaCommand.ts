/**
 * Lua command implementing ICommand interface.
 * Provides `lua` command for interactive REPL or script execution.
 */

import type { ICommand, IProcess, ShellContext } from '@lua-learning/shell-core'
import { LuaReplProcess, type LuaReplProcessOptions } from './LuaReplProcess'
import { LuaScriptProcess } from './LuaScriptProcess'

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
  readonly usage = 'lua [filename]'

  /**
   * Execute the command.
   * @param args - Command arguments. If empty, starts REPL. If filename provided, executes script.
   * @param context - Shell execution context
   * @returns IProcess for the Lua execution
   */
  execute(args: string[], context: ShellContext): IProcess {
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
          fileSystem: context.filesystem,
          scriptDirectory,
        }
      : undefined

    if (!filename) {
      // No arguments - start interactive REPL with canvas support
      return new LuaReplProcess({
        ...DEFAULT_EXECUTION_OPTIONS,
        canvasCallbacks,
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
}
