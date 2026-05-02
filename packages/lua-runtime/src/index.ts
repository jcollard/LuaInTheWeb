/**
 * @lua-learning/lua-runtime
 *
 * Lua runtime implementation for shell process model.
 * Provides the `lua` command with REPL and script execution.
 */

// Main command export
export { LuaCommand, type CanvasMode, type ScreenMode, type HotReloadMode } from './LuaCommand'

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

// LocalStorage library export (auto-generated from localstorage.lua)
export { LUA_LOCALSTORAGE_CODE } from './lua/localstorage.generated'

// ANSI library export (auto-generated from ansi.lua)
export { LUA_ANSI_CODE } from './lua/ansi.generated'

// Audio library export (auto-generated from ail_audio.lua)
export { LUA_AIL_AUDIO_CODE } from './lua/ail_audio.generated'

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

// Audio Lua code modules (for bundling in exports)
export { audioLuaCode } from './audioLuaCode'

// Audio asset management (for standalone audio mode)
export { AudioAssetManager } from './AudioAssetManager'
export { setupAudioAssetAPI, type AudioAssetAPIOptions } from './setupAudioAssetAPI'

// Audio inline JS for HTML exports (auto-generated from audio-inline-entry.ts)
export { AUDIO_INLINE_JS } from './audio/audio-inline.generated'

// Chip (OPL3 FM synthesis) modules
export { setupChipAPI } from './setupChipAPI'
export { setupChipAssetAPI, type ChipAssetAPIOptions } from './setupChipAssetAPI'
export { ChipAssetManager, type ChipAssetDefinition } from './ChipAssetManager'
export { chipLuaCode } from './chipLuaCode'
export { CHIP_INLINE_JS } from './chip/chip-inline.generated'

// Wasmoon inline JS for HTML exports (auto-generated, includes embedded WASM)
export { WASMOON_INLINE_JS } from './wasmoon-inline.generated'

// Xterm inline JS and CSS for HTML shell/ANSI exports (auto-generated)
export { XTERM_INLINE_JS, XTERM_INLINE_CSS } from './xterm-inline.generated'

// Canvas controller for shell-based canvas (non-worker)
export { CanvasController, type CanvasCallbacks } from './CanvasController'

// ANSI terminal controller for shell-based ANSI terminal
export { AnsiController, type AnsiCallbacks, type AnsiTerminalHandle, type LayerInfo } from './AnsiController'

// CRT post-processing shader for ANSI terminal
export { CrtShader, CRT_DEFAULTS, type CrtConfig, type CrtShaderOptions } from './crtShader'

// ANSI terminal API setup and Lua code modules (for bundling in exports)
export { setupAnsiAPI, type AnsiAPIOptions } from './setupAnsiAPI'
export { ansiLuaCode } from './ansiLuaWrapper'
export { ansiLuaCoreCode, ansiLuaInputCode } from './ansiLuaCode'

// Asset manager for asset registration, loading, and lifecycle
export { AssetManager, type IAssetManager, type AudioAssetManifest } from './AssetManager'

// Input API for keyboard, mouse, and gamepad input handling
export { InputAPI, type IInputCapture } from './InputAPI'

// Path2D registry for reusable path objects
export { Path2DRegistry, type IPath2DRegistry, type IPath2DRenderer } from './Path2DRegistry'

// Style API for line styles, fill/stroke, shadows, and compositing
export { StyleAPI, type IStyleAPI } from './StyleAPI'

// Path API for path operations, hit testing support
export { PathAPI, type IPathAPI, type FillRule } from './PathAPI'

// Transform API for canvas transformations (translate, rotate, scale, etc.)
export { TransformAPI, type ITransformAPI } from './TransformAPI'

// Pixel-perfect ANSI renderer and bitmap font registry.
export {
  PixelAnsiRenderer,
  type PixelAnsiRendererHandle,
  type PixelAnsiRendererOptions,
  type PixelAnsiRendererTheme,
} from './pixelAnsiRenderer'
export {
  BITMAP_FONT_REGISTRY,
  DEFAULT_FONT_ID,
  getFontById,
  type BitmapFontRegistryEntry,
} from './fontRegistry'
export { FONT_ATLASES, type FontAtlas } from './glyphAtlas.generated'
export {
  ANSI_FONT_DATA,
  type AnsiFontDataEntry,
} from './ansi-fonts-inline.generated'
export {
  getBlockReference,
  getMissingBlockFallbacks,
  BLOCK_GLYPH_REFERENCE_8X16,
} from './blockGlyphReference'
export { getFontCoverage } from './fontCoverage'
export {
  rasterizeGlyphForDebug,
  type GlyphDebugInfo,
} from './glyphDebug'
