/**
 * Shared defaults for renderer-config fields that flow from the
 * `.ansi.lua` file format through the editor and runtime. Extracted
 * here so both the editor-side panel and the future file-format codec
 * can reference a single source of truth.
 */

/**
 * Default for the per-screen `useFontBlocks` field. When true, the
 * editor mounts the pixel-perfect bitmap renderer (the default); when
 * false, it falls back to xterm.js + CanvasAddon.
 */
export const DEFAULT_USE_FONT_BLOCKS = true
