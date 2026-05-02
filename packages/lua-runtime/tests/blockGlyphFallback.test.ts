import { describe, it, expect } from 'vitest'
import { getMissingBlockFallbacks } from '../src/blockGlyphReference'
import { FONT_ATLASES } from '../src/glyphAtlas.generated'

describe('getMissingBlockFallbacks', () => {
  const has = (present: Iterable<number>) => {
    const set = new Set(present)
    return (cp: number) => set.has(cp)
  }

  it('returns an empty map when cell size is not 8x16', () => {
    expect(getMissingBlockFallbacks(8, 8, has([])).size).toBe(0)
    expect(getMissingBlockFallbacks(9, 16, has([])).size).toBe(0)
  })

  it('returns canonical masks for every U+2580-U+259F when none are present', () => {
    const fallbacks = getMissingBlockFallbacks(8, 16, has([]))
    expect(fallbacks.size).toBe(0x20)
    for (let cp = 0x2580; cp <= 0x259F; cp++) {
      const mask = fallbacks.get(cp)
      expect(mask, `U+${cp.toString(16)}`).toBeDefined()
      expect(mask!.length).toBe(8 * 16)
    }
  })

  it('skips codepoints reported as already present', () => {
    const present = [0x2588, 0x2580, 0x2590]
    const fallbacks = getMissingBlockFallbacks(8, 16, has(present))
    for (const cp of present) {
      expect(fallbacks.has(cp), `U+${cp.toString(16)} should not be in fallbacks`).toBe(false)
    }
    expect(fallbacks.has(0x2595)).toBe(true)
  })

  it('U+2595 RIGHT ONE EIGHTH has only the last column (col 7) set', () => {
    const fallbacks = getMissingBlockFallbacks(8, 16, has([]))
    const mask = fallbacks.get(0x2595)!
    for (let r = 0; r < 16; r++) {
      expect(mask[r * 8 + 7], `row ${r} col 7`).toBe(1)
      for (let c = 0; c < 7; c++) {
        expect(mask[r * 8 + c], `row ${r} col ${c}`).toBe(0)
      }
    }
  })

  it('U+2594 UPPER ONE EIGHTH has only the top rows set', () => {
    const fallbacks = getMissingBlockFallbacks(8, 16, has([]))
    const mask = fallbacks.get(0x2594)!
    // Top 1/8 of 16 rows = rows 0..1 set, rows 2..15 empty.
    for (let c = 0; c < 8; c++) {
      expect(mask[0 * 8 + c], `row 0 col ${c}`).toBe(1)
      expect(mask[1 * 8 + c], `row 1 col ${c}`).toBe(1)
      for (let r = 2; r < 16; r++) {
        expect(mask[r * 8 + c], `row ${r} col ${c}`).toBe(0)
      }
    }
  })
})

describe('getMissingBlockFallbacks — IBM_VGA_8x16 coverage', () => {
  // Regression: the IBM VGA 8x16 ROM font is missing many block-element
  // glyphs (it ships only the eighths IBM VGA hardware had). Without a
  // canonical fallback, U+2595 / U+2594 / quadrants render as empty cells
  // in the editor.
  it('fills in the block elements that IBM_VGA_8x16 does not ship', () => {
    const atlas = FONT_ATLASES.get('IBM_VGA_8x16')!
    const fallbacks = getMissingBlockFallbacks(
      atlas.cellW,
      atlas.cellH,
      (cp) => atlas.glyphs.has(cp),
    )
    // The codepoint reported by the user.
    expect(fallbacks.has(0x2595), 'U+2595 (Right One Eighth) missing fallback').toBe(true)
    // Other known gaps in this font.
    for (const cp of [0x2594, 0x2596, 0x2597, 0x2598, 0x2599, 0x259A, 0x259B,
                      0x259C, 0x259D, 0x259E, 0x259F]) {
      expect(fallbacks.has(cp), `U+${cp.toString(16)} missing fallback`).toBe(true)
    }
    // The full block U+2588 ships in the font's atlas, so no fallback for it.
    expect(fallbacks.has(0x2588)).toBe(false)
  })
})
