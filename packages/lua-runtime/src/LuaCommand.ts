/**
 * Lua command implementing ICommand interface.
 * Provides `lua` command for interactive REPL or script execution.
 */

import type { ICommand, IProcess, ShellContext } from '@lua-learning/shell-core'
import { LuaReplProcess } from './LuaReplProcess'
import { LuaScriptProcess } from './LuaScriptProcess'

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
      return new LuaReplProcess()
    }

    // Filename provided - execute script
    const filename = args[0]
    return new LuaScriptProcess(filename, context)
  }
}
