import { describe, it, expect } from 'vitest'
import { paintGridIntoBuffer, gridPngDimensions, scaledPngDimensions, PNG_EXPORT_SCALES } from './pngExport'
import type { AnsiCell, AnsiGrid, RGBColor } from './types'

const FG: RGBColor = [255, 128, 64]
const BG: RGBColor = [10, 20, 30]

function cell(char: string = ' ', fg: RGBColor = FG, bg: RGBColor = BG): AnsiCell {
  return { char, fg, bg }
}

function emptyGrid(cols: number, rows: number): AnsiGrid {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => cell()))
}

function pixelAt(data: Uint8ClampedArray, x: number, y: number, imgWidth: number): [number, number, number, number] {
  const p = (y * imgWidth + x) * 4
  return [data[p], data[p + 1], data[p + 2], data[p + 3]]
}

describe('paintGridIntoBuffer', () => {
  it('writes background color when codepoint has no mask', () => {
    // 1×1 grid, 2×2 cells, no entries in masks → background-only.
    const grid: AnsiGrid = [[cell(' ')]]
    const data = new Uint8ClampedArray(2 * 2 * 4)
    paintGridIntoBuffer(data, grid, new Map(), { w: 2, h: 2 }, 2)
    for (let py = 0; py < 2; py++) {
      for (let px = 0; px < 2; px++) {
        expect(pixelAt(data, px, py, 2)).toEqual([10, 20, 30, 255])
      }
    }
  })

  it('writes foreground for mask=1 pixels and background for mask=0 pixels', () => {
    const grid: AnsiGrid = [[cell('A')]]
    const masks = new Map<number, Uint8Array>([[0x41, new Uint8Array([1, 0, 0, 1])]])
    const data = new Uint8ClampedArray(2 * 2 * 4)
    paintGridIntoBuffer(data, grid, masks, { w: 2, h: 2 }, 2)
    expect(pixelAt(data, 0, 0, 2)).toEqual([255, 128, 64, 255])
    expect(pixelAt(data, 1, 0, 2)).toEqual([10, 20, 30, 255])
    expect(pixelAt(data, 0, 1, 2)).toEqual([10, 20, 30, 255])
    expect(pixelAt(data, 1, 1, 2)).toEqual([255, 128, 64, 255])
  })

  it('always sets alpha to 255', () => {
    const grid: AnsiGrid = [[cell('B')]]
    const masks = new Map<number, Uint8Array>([[0x42, new Uint8Array([1, 0, 1, 0])]])
    const data = new Uint8ClampedArray(2 * 2 * 4)
    paintGridIntoBuffer(data, grid, masks, { w: 2, h: 2 }, 2)
    for (let i = 3; i < data.length; i += 4) expect(data[i]).toBe(255)
  })

  it('places cells at (cellX*cellW, cellY*cellH) offsets in row-major order', () => {
    // 2×2 grid of 2×2 cells, image is 4×4 pixels. Each cell uses a unique fg
    // so we can verify per-cell placement via the pattern at top-left of each cell.
    const c00 = cell('A', [1, 1, 1])
    const c10 = cell('A', [2, 2, 2])
    const c01 = cell('A', [3, 3, 3])
    const c11 = cell('A', [4, 4, 4])
    const grid: AnsiGrid = [[c00, c10], [c01, c11]]
    const masks = new Map<number, Uint8Array>([[0x41, new Uint8Array([1, 0, 0, 0])]])
    const data = new Uint8ClampedArray(4 * 4 * 4)
    paintGridIntoBuffer(data, grid, masks, { w: 2, h: 2 }, 4)
    // Mask is 1 only at the cell-local (0,0) position.
    expect(pixelAt(data, 0, 0, 4)).toEqual([1, 1, 1, 255])  // cell (0,0)
    expect(pixelAt(data, 2, 0, 4)).toEqual([2, 2, 2, 255])  // cell (1,0)
    expect(pixelAt(data, 0, 2, 4)).toEqual([3, 3, 3, 255])  // cell (0,1)
    expect(pixelAt(data, 2, 2, 4)).toEqual([4, 4, 4, 255])  // cell (1,1)
  })

  it('does not write outside the cells (loops are < cellW/cellH, not <=)', () => {
    // Image larger than the grid: 3×3 pixels for a 1×1 grid of 2×2 cells.
    // The "extra" row and column (x=2 or y=2) must remain at the sentinel.
    const grid: AnsiGrid = [[cell(' ')]]
    const data = new Uint8ClampedArray(3 * 3 * 4)
    data.fill(0x42)
    paintGridIntoBuffer(data, grid, new Map(), { w: 2, h: 2 }, 3)
    expect(pixelAt(data, 2, 0, 3)).toEqual([0x42, 0x42, 0x42, 0x42])
    expect(pixelAt(data, 2, 1, 3)).toEqual([0x42, 0x42, 0x42, 0x42])
    expect(pixelAt(data, 0, 2, 3)).toEqual([0x42, 0x42, 0x42, 0x42])
    expect(pixelAt(data, 1, 2, 3)).toEqual([0x42, 0x42, 0x42, 0x42])
    expect(pixelAt(data, 2, 2, 3)).toEqual([0x42, 0x42, 0x42, 0x42])
  })

  it('handles an empty grid without writing anything', () => {
    const data = new Uint8ClampedArray(4 * 4 * 4)
    data.fill(0x42)
    paintGridIntoBuffer(data, [], new Map(), { w: 2, h: 2 }, 4)
    for (let i = 0; i < data.length; i++) expect(data[i]).toBe(0x42)
  })
})

describe('gridPngDimensions', () => {
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
