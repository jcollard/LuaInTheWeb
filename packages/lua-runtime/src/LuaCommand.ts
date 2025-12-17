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

    // Build canvas callbacks if available in context
    const canvasCallbacks = context.onRequestCanvasTab && context.onCloseCanvasTab
      ? {
          onRequestCanvasTab: context.onRequestCanvasTab,
          onCloseCanvasTab: context.onCloseCanvasTab,
        }
      : undefined

    if (args.length === 0) {
      // No arguments - start interactive REPL with canvas support
      return new LuaReplProcess({
        ...DEFAULT_EXECUTION_OPTIONS,
        canvasCallbacks,
      })
    }

    // Filename provided - execute script
    const filename = args[0]

    // Build options, including canvas callbacks if available
    const options = {
      ...DEFAULT_EXECUTION_OPTIONS,
      canvasCallbacks,
    }

    return new LuaScriptProcess(filename, context, options)
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
