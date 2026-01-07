/**
 * @lua-learning/lua-runtime
 *
 * Lua runtime implementation for shell process model.
 * Provides the `lua` command with REPL and script execution.
 */

// Main command export
export { LuaCommand, type CanvasMode } from './LuaCommand'

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

// HC collision detection library export (auto-generated from hc.lua)
export { LUA_HC_CODE } from './lua/hc.generated'

// Canvas Lua code modules (for bundling in exports)
export {
  canvasLuaCoreCode,
  canvasLuaPathCode,
  canvasLuaStylingCode,
  canvasLuaTextCode,
  canvasLuaInputCode,
  canvasLuaAudioCode,
} from './canvasLuaCode'

// Audio engine exports (for standalone runtime)
export { WebAudioEngine } from './audio/WebAudioEngine'
export type { IAudioEngine, MusicOptions, MusicHandle } from './audio/IAudioEngine'

// Audio inline JS for HTML exports (auto-generated from audio-inline-entry.ts)
export { AUDIO_INLINE_JS } from './audio/audio-inline.generated'

// Wasmoon inline JS for HTML exports (auto-generated, includes embedded WASM)
export { WASMOON_INLINE_JS } from './wasmoon-inline.generated'

// Xterm inline JS and CSS for HTML shell exports (auto-generated)
export { XTERM_INLINE_JS, XTERM_INLINE_CSS } from './xterm-inline.generated'

// Canvas controller for shell-based canvas (non-worker)
export { CanvasController, type CanvasCallbacks } from './CanvasController'
