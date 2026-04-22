/**
 * Bitmap font registry for the ANSI pixel renderer.
 *
 * Adding a new font: drop TTF under `scripts/fonts/` and WOFF under
 * `lua-learning-website/public/fonts/`, add an entry here, add an
 * `@font-face` rule in the editor-panel CSS. See
 * `docs/ansi/adding-a-bitmap-font.md` for the full checklist.
 */

export interface BitmapFontRegistryEntry {
  /** Stable ID used by the file format and registry lookups. */
  id: string
  /** Human-readable label for UI dropdowns. */
  label: string
  /**
   * TTF path relative to the atlas generator's CWD
   * (`packages/lua-runtime`). Build-time only, not shipped to runtime.
   */
  ttfPath: string
  /** WOFF URL served under `/fonts/` for the runtime xterm path and fillText fallback. */
  woffPath: string
  /** CSS `@font-face` family name that resolves to the WOFF. */
  fontFamily: string
  /** Cell width in source pixels. */
  cellW: number
  /** Cell height in source pixels. */
  cellH: number
  /** EBDT strike ppem to extract in the atlas generator (usually `cellH`). */
  nativePpem: number
}

export const BITMAP_FONT_REGISTRY: readonly BitmapFontRegistryEntry[] = [
  {
    id: 'IBM_CGA_8x8',
    label: 'IBM CGA 8×8',
    ttfPath: 'scripts/fonts/MxPlus_IBM_CGA.ttf',
    woffPath: '/fonts/WebPlus_IBM_CGA.woff',
    fontFamily: 'Web IBM CGA',
    cellW: 8,
    cellH: 8,
    nativePpem: 8,
  },
  {
    id: 'IBM_VGA_8x16',
    label: 'IBM VGA 8×16',
    ttfPath: 'scripts/fonts/MxPlus_IBM_VGA_8x16.ttf',
    woffPath: '/fonts/WebPlus_IBM_VGA_8x16.woff',
    fontFamily: 'Web IBM VGA 8x16',
    cellW: 8,
    cellH: 16,
    nativePpem: 16,
  },
  {
    id: 'IBM_VGA_9x16',
    label: 'IBM VGA 9×16',
    ttfPath: 'scripts/fonts/MxPlus_IBM_VGA_9x16.ttf',
    woffPath: '/fonts/WebPlus_IBM_VGA_9x16.woff',
    fontFamily: 'Web IBM VGA 9x16',
    cellW: 9,
    cellH: 16,
    nativePpem: 16,
  },
] as const

export const DEFAULT_FONT_ID = 'IBM_VGA_8x16'

export function getFontById(id: string): BitmapFontRegistryEntry | undefined {
  return BITMAP_FONT_REGISTRY.find((f) => f.id === id)
}
