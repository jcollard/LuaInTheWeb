/**
 * Single-glyph rasterization used by the `/glyph-debug` page.
 * Uses the shared {@link rasterizeGlyph} with `keepRawAlpha` so the page
 * can display the pre-threshold AA alongside the binary mask.
 */

import { getFontById } from './fontRegistry'
import { createGlyphContext, rasterizeGlyph } from './glyphRaster'

export interface GlyphDebugInfo {
  codepoint: number
  char: string
  cellW: number
  cellH: number
  rawAlpha: Uint8Array
  mask: Uint8Array
  hasContent: boolean
}

function emptyInfo(cp: number, cellW: number, cellH: number): GlyphDebugInfo {
  const zero = new Uint8Array(cellW * cellH)
  return {
    codepoint: cp,
    char: String.fromCodePoint(cp),
    cellW,
    cellH,
    rawAlpha: zero,
    mask: zero,
    hasContent: false,
  }
}

/**
 * Rasterize one glyph at the given font's native cell size via fillText
 * + alpha threshold. Used by the diagnostic page to show what xterm-path
 * rendering would look like for this codepoint. Non-browser environments
 * return an empty mask.
 */
export async function rasterizeGlyphForDebug(
  codepoint: number,
  fontId: string,
): Promise<GlyphDebugInfo> {
  const entry = getFontById(fontId)
  if (!entry) throw new Error(`rasterizeGlyphForDebug: unknown fontId "${fontId}"`)
  const { cellW, cellH, fontFamily } = entry

  const ctx = await createGlyphContext(fontFamily, cellW, cellH)
  if (!ctx) return emptyInfo(codepoint, cellW, cellH)

  const result = rasterizeGlyph(ctx, codepoint, cellW, cellH, { keepRawAlpha: true })
  return {
    codepoint,
    char: String.fromCodePoint(codepoint),
    cellW,
    cellH,
    mask: result.mask,
    rawAlpha: result.rawAlpha!,
    hasContent: result.hasContent,
  }
}
