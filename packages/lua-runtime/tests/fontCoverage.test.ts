import { describe, it, expect } from 'vitest'
import { getFontCoverage } from '../src/fontCoverage'
import { FONT_ATLASES } from '../src/glyphAtlas.generated'

describe('getFontCoverage', () => {
  it('returns the atlas codepoints for a registered font', () => {
    const cov = getFontCoverage('IBM_VGA_8x16')
    const atlas = FONT_ATLASES.get('IBM_VGA_8x16')!
    expect(cov.size).toBe(atlas.glyphs.size)
    for (const cp of atlas.glyphs.keys()) {
      expect(cov.has(cp), `atlas U+${cp.toString(16)} should be in coverage`).toBe(true)
    }
  })

  it('returns an empty set for an unknown fontId', () => {
    expect(getFontCoverage('NOT_A_FONT').size).toBe(0)
  })

  it('does not include codepoints absent from the atlas, even at 8x16', () => {
    // The IBM VGA 8x16 ROM charset omits U+2595 ▕. The pixel renderer
    // installs a canonical fallback so the canvas can still paint it,
    // but coverage is font-faithful — the WOFF cannot preview U+2595, so
    // it stays out so the palette filter matches what the DOM can show.
    const cov = getFontCoverage('IBM_VGA_8x16')
    expect(cov.has(0x2595)).toBe(false)
    expect(cov.has(0x2594)).toBe(false)
    expect(cov.has(0x2596)).toBe(false)
  })

  it('matches the atlas exactly across all registered fonts', () => {
    for (const id of ['IBM_CGA_8x8', 'IBM_VGA_8x16', 'IBM_VGA_9x16']) {
      const atlas = FONT_ATLASES.get(id)!
      const cov = getFontCoverage(id)
      expect(cov.size, id).toBe(atlas.glyphs.size)
    }
  })

  it('caches results by fontId (returns the same set instance)', () => {
    const a = getFontCoverage('IBM_VGA_8x16')
    const b = getFontCoverage('IBM_VGA_8x16')
    expect(a).toBe(b)
  })
})
