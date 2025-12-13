/**
 * Lua command implementing ICommand interface.
 * Provides `lua` command for interactive REPL or script execution.
 */

import type { ICommand, IProcess, ShellContext } from '@lua-learning/shell-core'
import { LuaReplProcess, type LuaReplProcessOptions } from './LuaReplProcess'
import { LuaScriptProcess, type LuaScriptProcessOptions } from './LuaScriptProcess'

/**
 * Default execution control options.
 * Stops execution after 1M lines (~0.5-1 second) to prevent browser freeze.
 * This provides a reasonable balance between allowing legitimate long-running
 * code and keeping the browser responsive.
 */
const DEFAULT_EXECUTION_OPTIONS = {
  instructionLimit: 1_000_000, // 1M lines for responsive UI
  // Stop after limit is reached (returns false = stop)
  onInstructionLimitReached: () => false,
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
    if (args.length === 0) {
      // No arguments - start interactive REPL
      return new LuaReplProcess(DEFAULT_EXECUTION_OPTIONS)
    }

    // Filename provided - execute script
    const filename = args[0]
    return new LuaScriptProcess(filename, context, DEFAULT_EXECUTION_OPTIONS as LuaScriptProcessOptions)
  }
}
