import { describe, it, expect } from 'vitest'
import { getFontCoverage } from '../src/fontCoverage'
import { FONT_ATLASES } from '../src/glyphAtlas.generated'

describe('getFontCoverage', () => {
  it('returns the atlas codepoints for a registered font', () => {
    const cov = getFontCoverage('IBM_VGA_8x16')
    const atlas = FONT_ATLASES.get('IBM_VGA_8x16')!
    for (const cp of atlas.glyphs.keys()) {
      expect(cov.has(cp), `atlas U+${cp.toString(16)} should be in coverage`).toBe(true)
    }
  })

  it('returns an empty set for an unknown fontId', () => {
    expect(getFontCoverage('NOT_A_FONT').size).toBe(0)
  })

  it('includes the full block-element range for IBM_VGA_8x16 (atlas + canonical fallbacks)', () => {
    const cov = getFontCoverage('IBM_VGA_8x16')
    for (let cp = 0x2580; cp <= 0x259F; cp++) {
      expect(cov.has(cp), `U+${cp.toString(16)} (block) should be covered`).toBe(true)
    }
    // The user-reported codepoint specifically.
    expect(cov.has(0x2595)).toBe(true)
  })

  it('does not extend block-element coverage for non-8x16 fonts', () => {
    // CGA 8x8 has no canonical fallback (the reference is 8x16-only),
    // so coverage equals the atlas exactly. Cross-check by sampling a
    // codepoint that's in the 8x16 reference but typically not in CGA.
    const cgaCov = getFontCoverage('IBM_CGA_8x8')
    const cgaAtlas = FONT_ATLASES.get('IBM_CGA_8x8')!
    expect(cgaCov.size).toBe(cgaAtlas.glyphs.size)
    expect(cgaCov.has(0x2595)).toBe(cgaAtlas.glyphs.has(0x2595))
  })

  it('caches results by fontId (returns the same set instance)', () => {
    const a = getFontCoverage('IBM_VGA_8x16')
    const b = getFontCoverage('IBM_VGA_8x16')
    expect(a).toBe(b)
  })
})
