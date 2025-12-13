/**
 * @lua-learning/lua-runtime
 *
 * Lua runtime implementation for shell process model.
 * Provides the `lua` command with REPL and script execution.
 */

// Main command export
export { LuaCommand } from './LuaCommand'

// Process exports
export { LuaReplProcess, type LuaReplProcessOptions } from './LuaReplProcess'
export { LuaScriptProcess, type LuaScriptProcessOptions } from './LuaScriptProcess'

// Engine factory export (for advanced usage)
export {
  LuaEngineFactory,
  formatLuaError,
  type LuaEngineCallbacks,
  type LuaEngineOptions,
} from './LuaEngineFactory'
