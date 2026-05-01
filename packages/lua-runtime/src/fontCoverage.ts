/**
 * Per-font Unicode coverage — the set of codepoints the pixel renderer
 * can paint with a pixel-perfect glyph for a given fontId.
 *
 * Sources combined:
 *   - the font's EBDT bitmap atlas (FONT_ATLASES) — codepoints the font
 *     ships with at the native ppem strike.
 *   - canonical block-element fallbacks (BLOCK_GLYPH_REFERENCE_8X16) —
 *     filled in for U+2580–U+259F when cellW=8 cellH=16 so editor users
 *     get every block element regardless of which IBM ROM gaps the font
 *     inherited.
 *
 * Codepoints outside this set still render through the runtime fillText
 * fallback, but quality and presence depend on the WOFF outline coverage
 * and on the browser's font-fallback chain — so consumers (e.g. the
 * editor's character palette) use this set to decide what to surface.
 */

import { FONT_ATLASES } from './glyphAtlas.generated'
import { BLOCK_GLYPH_REFERENCE_8X16 } from './blockGlyphReference'

const coverageCache = new Map<string, ReadonlySet<number>>()

export function getFontCoverage(fontId: string): ReadonlySet<number> {
  const cached = coverageCache.get(fontId)
  if (cached) return cached
  const atlas = FONT_ATLASES.get(fontId)
  if (!atlas) {
    const empty: ReadonlySet<number> = new Set()
    coverageCache.set(fontId, empty)
    return empty
  }
  const out = new Set<number>(atlas.glyphs.keys())
  if (atlas.cellW === 8 && atlas.cellH === 16) {
    for (const cp of BLOCK_GLYPH_REFERENCE_8X16.keys()) out.add(cp)
  }
  coverageCache.set(fontId, out)
  return out
}
