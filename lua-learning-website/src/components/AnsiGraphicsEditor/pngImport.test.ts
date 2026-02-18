import { describe, it, expect } from 'vitest'
import { computeScaledSize, rgbaToAnsiGrid } from './pngImport'
import { ANSI_COLS, ANSI_ROWS, HALF_BLOCK, DEFAULT_CELL, DEFAULT_BG } from './types'
import type { RGBColor } from './types'

/** Helper: create an RGBA buffer filled with a single color (or transparent). */
function makeRgba(
  width: number,
  height: number,
  fill: [number, number, number, number] = [255, 0, 0, 255],
): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    buf[i * 4] = fill[0]
    buf[i * 4 + 1] = fill[1]
    buf[i * 4 + 2] = fill[2]
    buf[i * 4 + 3] = fill[3]
  }
  return buf
}

/** Helper: set a single pixel in an RGBA buffer. */
function setPixel(
  buf: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  rgba: [number, number, number, number],
): void {
  const idx = (y * width + x) * 4
  buf[idx] = rgba[0]
  buf[idx + 1] = rgba[1]
  buf[idx + 2] = rgba[2]
  buf[idx + 3] = rgba[3]
}

describe('computeScaledSize', () => {
  it('returns unchanged dimensions when image already fits', () => {
    expect(computeScaledSize(40, 30, 80, 50)).toEqual({ width: 40, height: 30 })
  })

  it('returns unchanged dimensions at exact boundary', () => {
    expect(computeScaledSize(80, 50, 80, 50)).toEqual({ width: 80, height: 50 })
  })

  it('scales down a wide image by width', () => {
    const result = computeScaledSize(160, 50, 80, 50)
    expect(result.width).toBe(80)
    expect(result.height).toBe(25)
  })

  it('scales down a tall image by height', () => {
    const result = computeScaledSize(80, 100, 80, 50)
    expect(result.width).toBe(40)
    expect(result.height).toBe(50)
  })

  it('never upscales small images', () => {
    expect(computeScaledSize(10, 5, 80, 50)).toEqual({ width: 10, height: 5 })
  })

  it('returns (0, 0) for zero dimensions', () => {
    expect(computeScaledSize(0, 0, 80, 50)).toEqual({ width: 0, height: 0 })
    expect(computeScaledSize(0, 10, 80, 50)).toEqual({ width: 0, height: 0 })
    expect(computeScaledSize(10, 0, 80, 50)).toEqual({ width: 0, height: 0 })
  })

  it('scales both dimensions proportionally', () => {
    // 200x100 into 80x50: scale = min(80/200, 50/100) = min(0.4, 0.5) = 0.4
    const result = computeScaledSize(200, 100, 80, 50)
    expect(result.width).toBe(80)
    expect(result.height).toBe(40)
  })
})

describe('rgbaToAnsiGrid', () => {
  it('always returns ANSI_ROWS x ANSI_COLS grid', () => {
    const rgba = makeRgba(2, 2)
    const grid = rgbaToAnsiGrid(rgba, 2, 2)
    expect(grid.length).toBe(ANSI_ROWS)
    for (const row of grid) {
      expect(row.length).toBe(ANSI_COLS)
    }
  })

  it('converts a single pixel (1x1) to a HALF_BLOCK cell with fg=color, bg=DEFAULT_BG', () => {
    const rgba = makeRgba(1, 1, [255, 0, 0, 255])
    const grid = rgbaToAnsiGrid(rgba, 1, 1)
    const cell = grid[0][0]
    expect(cell.char).toBe(HALF_BLOCK)
    expect(cell.fg).toEqual([255, 0, 0])
    expect(cell.bg).toEqual(DEFAULT_BG)
  })

  it('converts two vertical pixels (1x2) to one cell with fg=top, bg=bottom', () => {
    const rgba = new Uint8ClampedArray(1 * 2 * 4)
    // Top pixel: red
    setPixel(rgba, 1, 0, 0, [255, 0, 0, 255])
    // Bottom pixel: green
    setPixel(rgba, 1, 0, 1, [0, 255, 0, 255])
    const grid = rgbaToAnsiGrid(rgba, 1, 2)
    const cell = grid[0][0]
    expect(cell.char).toBe(HALF_BLOCK)
    expect(cell.fg).toEqual([255, 0, 0])
    expect(cell.bg).toEqual([0, 255, 0])
  })

  it('treats pixel with alpha < 128 as transparent (DEFAULT_CELL)', () => {
    const rgba = makeRgba(1, 1, [255, 0, 0, 100]) // alpha = 100 < 128
    const grid = rgbaToAnsiGrid(rgba, 1, 1)
    expect(grid[0][0]).toEqual(DEFAULT_CELL)
  })

  it('treats pixel with alpha >= 128 as opaque', () => {
    const rgba = makeRgba(1, 1, [255, 0, 0, 128]) // alpha = 128, exactly at threshold
    const grid = rgbaToAnsiGrid(rgba, 1, 1)
    expect(grid[0][0].char).toBe(HALF_BLOCK)
    expect(grid[0][0].fg).toEqual([255, 0, 0])
  })

  it('fills all cells for a full 80x50 image', () => {
    const rgba = makeRgba(80, 50, [100, 150, 200, 255])
    const grid = rgbaToAnsiGrid(rgba, 80, 50)
    for (let r = 0; r < ANSI_ROWS; r++) {
      for (let c = 0; c < ANSI_COLS; c++) {
        expect(grid[r][c].char).toBe(HALF_BLOCK)
        expect(grid[r][c].fg).toEqual([100, 150, 200])
        expect(grid[r][c].bg).toEqual([100, 150, 200])
      }
    }
  })

  it('places a small image at top-left, rest is DEFAULT_CELL', () => {
    const rgba = makeRgba(2, 2, [255, 0, 0, 255])
    const grid = rgbaToAnsiGrid(rgba, 2, 2)
    // Top-left cells should be colored
    expect(grid[0][0].char).toBe(HALF_BLOCK)
    expect(grid[0][1].char).toBe(HALF_BLOCK)
    // Cell at (0, 2) should be default
    expect(grid[0][2]).toEqual(DEFAULT_CELL)
    // Row 1 should be all default
    expect(grid[1][0]).toEqual(DEFAULT_CELL)
  })

  it('produces DEFAULT_CELL when both halves are DEFAULT_BG (not HALF_BLOCK with black/black)', () => {
    // Create a 1x2 image where both pixels are DEFAULT_BG color but opaque
    const rgba = new Uint8ClampedArray(1 * 2 * 4)
    const [dr, dg, db] = DEFAULT_BG as RGBColor
    setPixel(rgba, 1, 0, 0, [dr, dg, db, 255])
    setPixel(rgba, 1, 0, 1, [dr, dg, db, 255])
    const grid = rgbaToAnsiGrid(rgba, 1, 2)
    // Should be DEFAULT_CELL, not a HALF_BLOCK with black fg and bg
    expect(grid[0][0]).toEqual(DEFAULT_CELL)
  })

  it('handles an odd-height image (last row has only a top pixel)', () => {
    const rgba = makeRgba(1, 3, [0, 0, 255, 255])
    const grid = rgbaToAnsiGrid(rgba, 1, 3)
    // Row 0: top pixel y=0, bottom pixel y=1
    expect(grid[0][0].char).toBe(HALF_BLOCK)
    expect(grid[0][0].fg).toEqual([0, 0, 255])
    expect(grid[0][0].bg).toEqual([0, 0, 255])
    // Row 1: top pixel y=2, no bottom pixel → bg=DEFAULT_BG
    expect(grid[1][0].char).toBe(HALF_BLOCK)
    expect(grid[1][0].fg).toEqual([0, 0, 255])
    expect(grid[1][0].bg).toEqual(DEFAULT_BG)
  })

  it('handles zero-size image gracefully', () => {
    const rgba = new Uint8ClampedArray(0)
    const grid = rgbaToAnsiGrid(rgba, 0, 0)
    expect(grid.length).toBe(ANSI_ROWS)
    expect(grid[0].length).toBe(ANSI_COLS)
    // All cells should be DEFAULT_CELL
    expect(grid[0][0]).toEqual(DEFAULT_CELL)
  })

  it('handles mixed opaque and transparent pixels in same cell', () => {
    const rgba = new Uint8ClampedArray(1 * 2 * 4)
    // Top pixel: opaque red
    setPixel(rgba, 1, 0, 0, [255, 0, 0, 255])
    // Bottom pixel: transparent
    setPixel(rgba, 1, 0, 1, [0, 255, 0, 50])
    const grid = rgbaToAnsiGrid(rgba, 1, 2)
    const cell = grid[0][0]
    expect(cell.char).toBe(HALF_BLOCK)
    expect(cell.fg).toEqual([255, 0, 0])
    expect(cell.bg).toEqual(DEFAULT_BG)
  })
})
