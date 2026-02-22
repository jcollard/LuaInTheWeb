import { describe, it, expect } from 'vitest'
import { computeRectCells, computeFloodFillCells, computeLineCells, computeBorderCells } from './gridUtils'
import type { AnsiGrid, RGBColor } from './types'
import { ANSI_ROWS, ANSI_COLS, DEFAULT_FG, DEFAULT_BG, HALF_BLOCK, BORDER_PRESETS } from './types'

function makeGrid(): AnsiGrid {
  return Array.from({ length: ANSI_ROWS }, () =>
    Array.from({ length: ANSI_COLS }, () => ({
      char: ' ',
      fg: [...DEFAULT_FG] as RGBColor,
      bg: [...DEFAULT_BG] as RGBColor,
    }))
  )
}

function makeSmallGrid(rows: number, cols: number): AnsiGrid {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      char: HALF_BLOCK,
      fg: [...red] as RGBColor,
      bg: [...blue] as RGBColor,
    }))
  )
}

const red: RGBColor = [255, 0, 0]
const blue: RGBColor = [0, 0, 255]

describe('computeRectCells — blend-pixel mode', () => {
  it('should paint with blended color instead of raw fg', () => {
    const grid = makeGrid()
    // blend-pixel: blendRgb(bg, fg, 0.25) = blendRgb([0,0,255], [255,0,0], 0.25) = [64,0,191]
    const brush = { char: '#', fg: red, bg: blue, mode: 'blend-pixel' as const }
    const start = { row: 0, col: 0, isTopHalf: true }
    const end = { row: 0, col: 0, isTopHalf: true }
    const cells = computeRectCells(start, end, brush, grid, true)
    const cell = cells.get('0,0')!
    expect(cell.char).toBe(HALF_BLOCK)
    expect(cell.fg).toEqual([64, 0, 191]) // blended color in top half
  })

  it('should use custom blendRatio when provided', () => {
    const grid = makeGrid()
    // blendRgb([0,0,255], [255,0,0], 0.5) = [128,0,128]
    const brush = { char: '#', fg: red, bg: blue, mode: 'blend-pixel' as const, blendRatio: 0.5 }
    const start = { row: 0, col: 0, isTopHalf: true }
    const end = { row: 0, col: 0, isTopHalf: true }
    const cells = computeRectCells(start, end, brush, grid, true)
    const cell = cells.get('0,0')!
    expect(cell.char).toBe(HALF_BLOCK)
    expect(cell.fg).toEqual([128, 0, 128])
  })
})

describe('computeLineCells — blend-pixel mode', () => {
  it('should paint with blended color along a line', () => {
    const grid = makeGrid()
    const brush = { char: '#', fg: red, bg: blue, mode: 'blend-pixel' as const }
    const start = { row: 0, col: 0, isTopHalf: true }
    const end = { row: 0, col: 2, isTopHalf: true }
    const cells = computeLineCells(start, end, brush, grid)
    for (const [, cell] of cells) {
      expect(cell.char).toBe(HALF_BLOCK)
      expect(cell.fg).toEqual([64, 0, 191])
    }
  })

  it('should use custom blendRatio when provided', () => {
    const grid = makeGrid()
    const brush = { char: '#', fg: red, bg: blue, mode: 'blend-pixel' as const, blendRatio: 0.5 }
    const start = { row: 0, col: 0, isTopHalf: true }
    const end = { row: 0, col: 2, isTopHalf: true }
    const cells = computeLineCells(start, end, brush, grid)
    for (const [, cell] of cells) {
      expect(cell.char).toBe(HALF_BLOCK)
      expect(cell.fg).toEqual([128, 0, 128])
    }
  })
})

describe('computeFloodFillCells — blend-pixel mode', () => {
  it('should flood fill with blended color', () => {
    const grid = makeSmallGrid(2, 2)
    const brush = { char: HALF_BLOCK, fg: red, bg: blue, mode: 'blend-pixel' as const }
    // Click top half (target = red)
    // blendRgb([0,0,255], [255,0,0], 0.25) = [64,0,191]
    const cells = computeFloodFillCells(0, 0, brush, grid, true)
    expect(cells.size).toBeGreaterThan(0)
    for (const [, cell] of cells) {
      expect(cell.fg).toEqual([64, 0, 191])
    }
  })

  it('should treat noopColor as the blended color', () => {
    // If target color already equals the blended color, should be no-op
    const blended: RGBColor = [64, 0, 191]
    const grid: AnsiGrid = Array.from({ length: 2 }, () =>
      Array.from({ length: 2 }, () => ({
        char: HALF_BLOCK,
        fg: [...blended] as RGBColor,
        bg: [...blue] as RGBColor,
      }))
    )
    const brush = { char: HALF_BLOCK, fg: red, bg: blue, mode: 'blend-pixel' as const }
    const cells = computeFloodFillCells(0, 0, brush, grid, true)
    expect(cells.size).toBe(0)
  })

  it('should use custom blendRatio when provided', () => {
    const grid = makeSmallGrid(2, 2)
    // blendRgb([0,0,255], [255,0,0], 0.75) = [191,0,64]
    const brush = { char: HALF_BLOCK, fg: red, bg: blue, mode: 'blend-pixel' as const, blendRatio: 0.75 }
    const cells = computeFloodFillCells(0, 0, brush, grid, true)
    expect(cells.size).toBeGreaterThan(0)
    for (const [, cell] of cells) {
      expect(cell.fg).toEqual([191, 0, 64])
    }
  })
})

describe('computeBorderCells', () => {
  const ascii = BORDER_PRESETS[0].style
  const double = BORDER_PRESETS[2].style

  it('should produce correct positional chars for a 3×4 border', () => {
    const grid = makeGrid()
    const brush = { char: '#', fg: red, bg: blue, mode: 'brush' as const, borderStyle: ascii }
    const start = { row: 1, col: 2, isTopHalf: true }
    const end = { row: 3, col: 5, isTopHalf: true }
    const cells = computeBorderCells(start, end, brush, grid)

    // 3 rows × 4 cols outline = 10 cells (same as rect-outline)
    expect(cells.size).toBe(10)

    // Corners
    expect(cells.get('1,2')!.char).toBe('+') // TL
    expect(cells.get('1,5')!.char).toBe('+') // TR
    expect(cells.get('3,2')!.char).toBe('+') // BL
    expect(cells.get('3,5')!.char).toBe('+') // BR

    // Top edge
    expect(cells.get('1,3')!.char).toBe('-') // T
    expect(cells.get('1,4')!.char).toBe('-') // T

    // Bottom edge
    expect(cells.get('3,3')!.char).toBe('-') // B
    expect(cells.get('3,4')!.char).toBe('-') // B

    // Left/Right edges
    expect(cells.get('2,2')!.char).toBe('|') // L
    expect(cells.get('2,5')!.char).toBe('|') // R

    // Interior should not be present
    expect(cells.has('2,3')).toBe(false)
    expect(cells.has('2,4')).toBe(false)

    // Verify colors
    const tl = cells.get('1,2')!
    expect(tl.fg).toEqual(red)
    expect(tl.bg).toEqual(blue)
  })

  it('should produce a single TL char for 1×1 border', () => {
    const grid = makeGrid()
    const brush = { char: '#', fg: red, bg: blue, mode: 'brush' as const, borderStyle: double }
    const point = { row: 5, col: 10, isTopHalf: true }
    const cells = computeBorderCells(point, point, brush, grid)

    expect(cells.size).toBe(1)
    expect(cells.get('5,10')!.char).toBe('╔') // TL
  })

  it('should produce TL, T..., TR for single-row border', () => {
    const grid = makeGrid()
    const brush = { char: '#', fg: red, bg: blue, mode: 'brush' as const, borderStyle: ascii }
    const start = { row: 3, col: 1, isTopHalf: true }
    const end = { row: 3, col: 5, isTopHalf: true }
    const cells = computeBorderCells(start, end, brush, grid)

    expect(cells.size).toBe(5)
    expect(cells.get('3,1')!.char).toBe('+') // TL
    expect(cells.get('3,2')!.char).toBe('-') // T
    expect(cells.get('3,3')!.char).toBe('-') // T
    expect(cells.get('3,4')!.char).toBe('-') // T
    expect(cells.get('3,5')!.char).toBe('+') // TR
  })

  it('should produce TL, L..., BL for single-column border', () => {
    const grid = makeGrid()
    const brush = { char: '#', fg: red, bg: blue, mode: 'brush' as const, borderStyle: ascii }
    const start = { row: 1, col: 4, isTopHalf: true }
    const end = { row: 4, col: 4, isTopHalf: true }
    const cells = computeBorderCells(start, end, brush, grid)

    expect(cells.size).toBe(4)
    expect(cells.get('1,4')!.char).toBe('+') // TL
    expect(cells.get('2,4')!.char).toBe('|') // L
    expect(cells.get('3,4')!.char).toBe('|') // L
    expect(cells.get('4,4')!.char).toBe('+') // BL
  })

  it('should produce 4 corners for 2×2 border', () => {
    const grid = makeGrid()
    const brush = { char: '#', fg: red, bg: blue, mode: 'brush' as const, borderStyle: double }
    const start = { row: 0, col: 0, isTopHalf: true }
    const end = { row: 1, col: 1, isTopHalf: true }
    const cells = computeBorderCells(start, end, brush, grid)

    expect(cells.size).toBe(4)
    expect(cells.get('0,0')!.char).toBe('╔') // TL
    expect(cells.get('0,1')!.char).toBe('╗') // TR
    expect(cells.get('1,0')!.char).toBe('╚') // BL
    expect(cells.get('1,1')!.char).toBe('╝') // BR
  })

  it('should fall back to rect-outline in pixel mode', () => {
    const grid = makeGrid()
    const brush = { char: '#', fg: red, bg: blue, mode: 'pixel' as const, borderStyle: ascii }
    const start = { row: 0, col: 0, isTopHalf: true }
    const end = { row: 1, col: 2, isTopHalf: true }
    const borderCells = computeBorderCells(start, end, brush, grid)
    const rectCells = computeRectCells(start, end, brush, grid, false)

    expect(borderCells.size).toBe(rectCells.size)
    for (const [key, cell] of borderCells) {
      expect(rectCells.has(key)).toBe(true)
      expect(cell.char).toBe(rectCells.get(key)!.char)
    }
  })

  it('should fall back to rect-outline in eraser mode', () => {
    const grid = makeGrid()
    grid[0][0] = { char: HALF_BLOCK, fg: [...red] as RGBColor, bg: [...blue] as RGBColor }
    const brush = { char: '#', fg: red, bg: blue, mode: 'eraser' as const, borderStyle: ascii }
    const start = { row: 0, col: 0, isTopHalf: true }
    const end = { row: 1, col: 2, isTopHalf: true }
    const borderCells = computeBorderCells(start, end, brush, grid)
    const rectCells = computeRectCells(start, end, brush, grid, false)

    expect(borderCells.size).toBe(rectCells.size)
  })

  it('should handle reversed start/end coordinates', () => {
    const grid = makeGrid()
    const brush = { char: '#', fg: red, bg: blue, mode: 'brush' as const, borderStyle: ascii }
    const start = { row: 3, col: 5, isTopHalf: true }
    const end = { row: 1, col: 2, isTopHalf: true }
    const cells = computeBorderCells(start, end, brush, grid)

    expect(cells.size).toBe(10)
    // Corners should still be at the correct positions
    expect(cells.get('1,2')!.char).toBe('+') // TL
    expect(cells.get('1,5')!.char).toBe('+') // TR
    expect(cells.get('3,2')!.char).toBe('+') // BL
    expect(cells.get('3,5')!.char).toBe('+') // BR
  })
})
