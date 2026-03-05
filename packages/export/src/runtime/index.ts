/**
 * Runtime modules for standalone HTML export.
 *
 * These modules provide the bridge between Lua code and JavaScript
 * for canvas and shell projects in exported HTML files.
 */

// Legacy exports from canvas-standalone (for backward compatibility)
export {
  canvasLuaCode,
  createCanvasRuntimeState as createCanvasRuntimeStateLegacy,
  setupCanvasBridge as setupCanvasBridgeLegacy,
  setupInputListeners as setupInputListenersLegacy,
  type CanvasRuntimeState as CanvasRuntimeStateLegacy,
} from './canvas-standalone'

// New interface-based canvas bridge
export type {
  AssetEntry,
  LoadedImage,
  LoadedFont,
  CanvasRuntimeState,
  AssetHandler,
  CanvasBridge,
} from './canvas-bridge-types.js'

export {
  createCanvasRuntimeState,
  setupInputListeners,
  CoreCanvasBridge,
} from './canvas-bridge-core.js'

export { DataUrlAssetHandler } from './data-url-asset-handler.js'

export { setupAssetBridge } from './asset-bridge.js'

// Shell exports
export {
  shellLuaCode,
  createShellRuntimeState,
  setupShellBridge,
  handleInput,
  type ShellRuntimeState,
} from './shell-standalone'

// ANSI exports (bundled inline JS for HTML embedding)
export { ANSI_INLINE_JS } from './ansi-inline.generated'

// xterm.js + CanvasAddon combined bundle (shared module context required)
export { XTERM_WITH_CANVAS_ADDON_JS } from './xterm-canvas.generated'
