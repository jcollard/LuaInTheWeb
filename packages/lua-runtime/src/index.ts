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
  ExecutionStoppedError,
  type LuaEngineCallbacks,
  type LuaEngineOptions,
  type ExecutionControlOptions,
} from './LuaEngineFactory'

// Shell library export (auto-generated from shell.lua)
export { LUA_SHELL_CODE } from './lua/shell.generated'

// Canvas library export (auto-generated from canvas.lua)
export { LUA_CANVAS_CODE } from './lua/canvas.generated'

// Canvas Lua code modules (for bundling in exports)
export {
  canvasLuaCoreCode,
  canvasLuaPathCode,
  canvasLuaStylingCode,
  canvasLuaTextCode,
  canvasLuaInputCode,
} from './canvasLuaCode'

// Canvas controller for shell-based canvas (non-worker)
export { CanvasController, type CanvasCallbacks } from './CanvasController'
