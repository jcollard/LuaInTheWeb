/**
 * Runtime modules for standalone HTML export.
 *
 * These modules provide the bridge between Lua code and JavaScript
 * for canvas and shell projects in exported HTML files.
 */

export {
  canvasLuaCode,
  createCanvasRuntimeState,
  setupCanvasBridge,
  setupInputListeners,
  type CanvasRuntimeState,
} from './canvas-standalone'

export {
  shellLuaCode,
  createShellRuntimeState,
  setupShellBridge,
  handleInput,
  type ShellRuntimeState,
} from './shell-standalone'
