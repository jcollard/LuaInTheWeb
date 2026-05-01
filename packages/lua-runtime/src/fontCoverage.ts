/**
 * Per-font Unicode coverage — the codepoints the font itself ships, taken
 * from the EBDT bitmap atlas. Used by the editor's character palette to
 * filter previews to glyphs the active font's WOFF can actually render.
 *
 * NOTE: this is intentionally narrower than what the pixel renderer can
 * paint. The renderer also installs canonical block-element fallbacks
 * (see `blockGlyphReference.ts`) for U+2580–U+259F at 8×16, so a glyph
 * outside this coverage set may still appear on the canvas — but it
 * would not preview correctly with `font-family: <font>` in the DOM,
 * which is why the palette filters by font coverage rather than renderer
 * capability.
 */

import { FONT_ATLASES } from './glyphAtlas.generated'

const coverageCache = new Map<string, ReadonlySet<number>>()

export function getFontCoverage(fontId: string): ReadonlySet<number> {
  const cached = coverageCache.get(fontId)
  if (cached) return cached
  const atlas = FONT_ATLASES.get(fontId)
  const coverage: ReadonlySet<number> = atlas ? new Set(atlas.glyphs.keys()) : new Set()
  coverageCache.set(fontId, coverage)
  return coverage
}
