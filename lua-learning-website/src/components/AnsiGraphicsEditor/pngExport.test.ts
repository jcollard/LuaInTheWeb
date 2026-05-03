import { describe, it, expect } from 'vitest'
import { paintCellInto, gridPngDimensions, scaledPngDimensions, PNG_EXPORT_SCALES } from './pngExport'
import type { AnsiGrid, RGBColor } from './types'

const FG: RGBColor = [255, 128, 64]
const BG: RGBColor = [10, 20, 30]

describe('paintCellInto', () => {
  it('writes background color when mask is undefined (missing glyph)', () => {
    const data = new Uint8ClampedArray(2 * 2 * 4)
    paintCellInto(data, undefined, FG, BG, 2, 2)
    for (let i = 0; i < 4; i++) {
      expect([data[i * 4], data[i * 4 + 1], data[i * 4 + 2], data[i * 4 + 3]]).toEqual([10, 20, 30, 255])
    }
  })

  it('writes foreground where mask is 1 and background where mask is 0', () => {
    const data = new Uint8ClampedArray(2 * 2 * 4)
    const mask = new Uint8Array([1, 0, 0, 1]) // diagonal pattern
    paintCellInto(data, mask, FG, BG, 2, 2)
    expect([data[0], data[1], data[2], data[3]]).toEqual([255, 128, 64, 255])      // (0,0) fg
    expect([data[4], data[5], data[6], data[7]]).toEqual([10, 20, 30, 255])         // (1,0) bg
    expect([data[8], data[9], data[10], data[11]]).toEqual([10, 20, 30, 255])       // (0,1) bg
    expect([data[12], data[13], data[14], data[15]]).toEqual([255, 128, 64, 255])   // (1,1) fg
  })

  it('always sets alpha to 255 (opaque)', () => {
    const data = new Uint8ClampedArray(3 * 1 * 4)
    paintCellInto(data, new Uint8Array([1, 0, 1]), FG, BG, 3, 1)
    expect(data[3]).toBe(255)
    expect(data[7]).toBe(255)
    expect(data[11]).toBe(255)
  })

  it('does not read past mask length when cellW * cellH matches mask length', () => {
    const data = new Uint8ClampedArray(8 * 16 * 4)
    const mask = new Uint8Array(8 * 16)
    mask.fill(1)
    expect(() => paintCellInto(data, mask, FG, BG, 8, 16)).not.toThrow()
    expect(data[0]).toBe(255)
    expect(data[(8 * 16 - 1) * 4]).toBe(255)
  })

  it('writes exactly cellW * cellH pixels (loop is < len, not <= len)', () => {
    // Buffer is 4 bytes longer than cellW*cellH pixels — the last 4 bytes
    // are sentinel 0x42. If the loop iterates one too many times, it
    // writes (bg[0], bg[1], bg[2], 255) over the sentinel.
    const data = new Uint8ClampedArray(2 * 2 * 4 + 4)
    data.fill(0x42)
    paintCellInto(data, undefined, FG, BG, 2, 2)
    expect(data[16]).toBe(0x42)
    expect(data[17]).toBe(0x42)
    expect(data[18]).toBe(0x42)
    expect(data[19]).toBe(0x42)
  })
})

describe('gridPngDimensions', () => {
  function emptyGrid(cols: number, rows: number): AnsiGrid {
    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({ char: ' ', fg: FG, bg: BG }))
    )
  }

  it('returns cols * cellW × rows * cellH', () => {
    expect(gridPngDimensions(emptyGrid(80, 25), 8, 16)).toEqual({ width: 640, height: 400 })
    expect(gridPngDimensions(emptyGrid(40, 12), 9, 16)).toEqual({ width: 360, height: 192 })
  })

  it('returns 0×0 for an empty grid', () => {
    expect(gridPngDimensions([], 8, 16)).toEqual({ width: 0, height: 0 })
  })

  it('handles a single-row grid', () => {
    expect(gridPngDimensions(emptyGrid(10, 1), 8, 16)).toEqual({ width: 80, height: 16 })
  })
})

describe('scaledPngDimensions', () => {
  function emptyGrid(cols: number, rows: number): AnsiGrid {
    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({ char: ' ', fg: FG, bg: BG }))
    )
  }
  const FONT = 'IBM_VGA_8x16'

  it('returns native size at scale=1', () => {
    expect(scaledPngDimensions(emptyGrid(80, 25), FONT, 1)).toEqual({ width: 640, height: 400 })
  })

  it('multiplies dimensions by scale', () => {
    expect(scaledPngDimensions(emptyGrid(80, 25), FONT, 2)).toEqual({ width: 1280, height: 800 })
    expect(scaledPngDimensions(emptyGrid(80, 25), FONT, 3)).toEqual({ width: 1920, height: 1200 })
  })

  it('clamps non-finite or sub-1 scale to 1', () => {
    const baseline = { width: 640, height: 400 }
    expect(scaledPngDimensions(emptyGrid(80, 25), FONT, 0)).toEqual(baseline)
    expect(scaledPngDimensions(emptyGrid(80, 25), FONT, -5)).toEqual(baseline)
    expect(scaledPngDimensions(emptyGrid(80, 25), FONT, NaN)).toEqual(baseline)
  })

  it('floors fractional scales', () => {
    expect(scaledPngDimensions(emptyGrid(80, 25), FONT, 2.7)).toEqual({ width: 1280, height: 800 })
  })

  it('returns 0×0 for unknown font', () => {
    expect(scaledPngDimensions(emptyGrid(80, 25), 'NOT_A_FONT', 2)).toEqual({ width: 0, height: 0 })
  })
})

describe('PNG_EXPORT_SCALES', () => {
  it('exposes 1, 2, 3 in order', () => {
    expect(PNG_EXPORT_SCALES).toEqual([1, 2, 3])
  })
})
