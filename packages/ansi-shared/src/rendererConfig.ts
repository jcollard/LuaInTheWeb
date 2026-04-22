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

/**
 * Default bitmap font ID for new screens. Must match a registry entry
 * in `@lua-learning/lua-runtime/fontRegistry.ts`. Kept here (rather than
 * imported from lua-runtime) because `ansi-shared` has zero deps on the
 * runtime — if the two drift, `getFontById(DEFAULT_ANSI_FONT_ID)` at
 * runtime returns undefined and callers should fall back defensively.
 */
export const DEFAULT_ANSI_FONT_ID = 'IBM_VGA_8x16'

/**
 * Normalize a possibly-untrusted `font` value from a parsed `.ansi.lua`
 * file to a string. Does NOT validate against the bitmap-font registry
 * (which lives in `@lua-learning/lua-runtime` — importing it here would
 * create a circular dep). Consumers should fall back again at render
 * time if the returned id isn't currently registered.
 */
export function normalizeAnsiFontId(raw: unknown): string {
  return typeof raw === 'string' && raw.length > 0 ? raw : DEFAULT_ANSI_FONT_ID
}
