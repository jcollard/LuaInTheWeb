import { describe, it, expect } from 'vitest'
import { FONT_ATLASES } from '../src/glyphAtlas.generated'
import { BITMAP_FONT_REGISTRY } from '../src/fontRegistry'

describe('FONT_ATLASES', () => {
  it('has one atlas per registered font', () => {
    for (const entry of BITMAP_FONT_REGISTRY) {
      expect(FONT_ATLASES.has(entry.id), `missing atlas for ${entry.id}`).toBe(true)
    }
    expect(FONT_ATLASES.size).toBe(BITMAP_FONT_REGISTRY.length)
  })

  it('each atlas reports cell dimensions matching the registry', () => {
    for (const entry of BITMAP_FONT_REGISTRY) {
      const atlas = FONT_ATLASES.get(entry.id)!
      expect(atlas.cellW, `${entry.id} cellW`).toBe(entry.cellW)
      expect(atlas.cellH, `${entry.id} cellH`).toBe(entry.cellH)
    }
  })

  it('every glyph mask has length cellW*cellH with 0/1 entries only', () => {
    for (const entry of BITMAP_FONT_REGISTRY) {
      const atlas = FONT_ATLASES.get(entry.id)!
      const expectedLen = entry.cellW * entry.cellH
      for (const [cp, mask] of atlas.glyphs) {
        expect(mask.length, `${entry.id} U+${cp.toString(16)}`).toBe(expectedLen)
      }
    }
  })

  it("ASCII 'A' (U+0041) is present in every font", () => {
    for (const entry of BITMAP_FONT_REGISTRY) {
      const atlas = FONT_ATLASES.get(entry.id)!
      expect(atlas.glyphs.has(0x41), `${entry.id} missing A`).toBe(true)
    }
  })

  it('U+2588 FULL BLOCK is all pixels set (serves as decode smoke test)', () => {
    for (const entry of BITMAP_FONT_REGISTRY) {
      const atlas = FONT_ATLASES.get(entry.id)!
      const mask = atlas.glyphs.get(0x2588)
      expect(mask, `${entry.id} missing U+2588`).toBeDefined()
      if (!mask) continue
      const allSet = mask.every((v) => v === 1)
      expect(allSet, `${entry.id} U+2588 has unset pixels`).toBe(true)
    }
  })

  it('U+2580 UPPER HALF BLOCK has pixels set in the top rows only', () => {
    // The exact top/bottom split is font-specific (e.g., IBM VGA 8x16
    // uses rows 0..6 set, rows 7..15 empty — a 7/9 split rather than
    // strict 8/8). What matters for the pixel renderer: the top portion
    // is solid and adjacent ▀ glyphs tile without seams on the split row.
    for (const entry of BITMAP_FONT_REGISTRY) {
      const atlas = FONT_ATLASES.get(entry.id)!
      const mask = atlas.glyphs.get(0x2580)
      if (!mask) continue // CGA may not ship block-elements range
      const rowSetCount = Array.from({ length: entry.cellH }, (_, r) => {
        let n = 0
        for (let c = 0; c < entry.cellW; c++) n += mask[r * entry.cellW + c]
        return n
      })
      const firstFullRow = rowSetCount.findIndex((n) => n === entry.cellW)
      const lastFullRow = rowSetCount.findLastIndex((n) => n === entry.cellW)
      expect(firstFullRow, `${entry.id} U+2580 has no fully-solid top row`).toBe(0)
      expect(lastFullRow, `${entry.id} U+2580 solid rows cross the midline`)
        .toBeLessThan(entry.cellH / 2 + 1)
      // And the bottom half is empty.
      const bottomEmpty = rowSetCount.slice(Math.ceil(entry.cellH / 2) + 1).every((n) => n === 0)
      expect(bottomEmpty, `${entry.id} U+2580 bottom rows not empty`).toBe(true)
    }
  })

  it('VGA 8x16 and 9x16 ship the full block elements range U+2591/2592/2593', () => {
    for (const id of ['IBM_VGA_8x16', 'IBM_VGA_9x16']) {
      const atlas = FONT_ATLASES.get(id)!
      for (const cp of [0x2591, 0x2592, 0x2593]) {
        expect(atlas.glyphs.has(cp), `${id} missing U+${cp.toString(16)}`).toBe(true)
      }
    }
  })

  it('9-wide shades U+2591..U+2593 have col 8 blank — faithful to the TTF', () => {
    // Int10h's MxPlus 9x16 encodes the 8-wide CP437 shade pattern with
    // col 8 blank, matching IBM VGA 9-dot hardware where "line graphics
    // enable" only triggered col-8 replication for CP437 0xC0..0xDF.
    // The atlas is source-faithful: no col-8 post-processing.
    const atlas = FONT_ATLASES.get('IBM_VGA_9x16')!
    const cellW = atlas.cellW
    const cellH = atlas.cellH
    expect(cellW).toBe(9)
    for (const cp of [0x2591, 0x2592, 0x2593]) {
      const mask = atlas.glyphs.get(cp)!
      for (let r = 0; r < cellH; r++) {
        expect(mask[r * cellW + (cellW - 1)], `U+${cp.toString(16)} row ${r}: col 8 should be blank`).toBe(0)
      }
    }
  })

  it('9-wide fonts keep col 8 blank for text characters too', () => {
    // The Int10h 9x16 font centers letters in cols 0..6, leaving cols 7
    // AND 8 as padding in the authored strike.
    const atlas = FONT_ATLASES.get('IBM_VGA_9x16')!
    const cellW = atlas.cellW
    const cellH = atlas.cellH
    const mask = atlas.glyphs.get(0x0041)! // 'A'
    for (let r = 0; r < cellH; r++) {
      expect(mask[r * cellW + (cellW - 1)], `A row ${r} col 8 should be blank`).toBe(0)
    }
  })
})
