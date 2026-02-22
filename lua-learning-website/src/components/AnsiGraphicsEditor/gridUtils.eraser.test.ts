import { describe, it, expect } from 'vitest'
import { computeRectCells, computeFloodFillCells, computeErasePixelCell, computeLineCells } from './gridUtils'
import type { AnsiCell, AnsiGrid, RGBColor } from './types'
import { ANSI_ROWS, ANSI_COLS, DEFAULT_FG, DEFAULT_BG, DEFAULT_CELL, HALF_BLOCK, TRANSPARENT_HALF } from './types'

function makeGrid(): AnsiGrid {
  return Array.from({ length: ANSI_ROWS }, () =>
    Array.from({ length: ANSI_COLS }, () => ({
      char: ' ',
      fg: [...DEFAULT_FG] as RGBColor,
      bg: [...DEFAULT_BG] as RGBColor,
    }))
  )
}

function makeSmallGrid(rows: number, cols: number, cell?: AnsiCell): AnsiGrid {
  const c = cell ?? { char: ' ', fg: [...DEFAULT_FG] as RGBColor, bg: [...DEFAULT_BG] as RGBColor }
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ ...c, fg: [...c.fg] as RGBColor, bg: [...c.bg] as RGBColor }))
  )
}

const red: RGBColor = [255, 0, 0]
const blue: RGBColor = [0, 0, 255]
const green: RGBColor = [0, 170, 0]

describe('computeErasePixelCell', () => {
  it('should erase top half of a half-block cell, preserving bottom', () => {
    const cell: AnsiCell = { char: HALF_BLOCK, fg: [...red] as RGBColor, bg: [...blue] as RGBColor }
    const result = computeErasePixelCell(cell, true)
    expect(result.char).toBe(HALF_BLOCK)
    expect(result.fg).toEqual(TRANSPARENT_HALF) // top erased
    expect(result.bg).toEqual(blue)             // bottom preserved
  })

  it('should erase bottom half of a half-block cell, preserving top', () => {
    const cell: AnsiCell = { char: HALF_BLOCK, fg: [...red] as RGBColor, bg: [...blue] as RGBColor }
    const result = computeErasePixelCell(cell, false)
    expect(result.char).toBe(HALF_BLOCK)
    expect(result.fg).toEqual(red)              // top preserved
    expect(result.bg).toEqual(TRANSPARENT_HALF) // bottom erased
  })

  it('should revert to DEFAULT_CELL when erasing top and bottom is already transparent', () => {
    const cell: AnsiCell = { char: HALF_BLOCK, fg: [...red] as RGBColor, bg: [...TRANSPARENT_HALF] as RGBColor }
    const result = computeErasePixelCell(cell, true)
    expect(result).toEqual(DEFAULT_CELL)
  })

  it('should revert to DEFAULT_CELL when erasing bottom and top is already transparent', () => {
    const cell: AnsiCell = { char: HALF_BLOCK, fg: [...TRANSPARENT_HALF] as RGBColor, bg: [...blue] as RGBColor }
    const result = computeErasePixelCell(cell, false)
    expect(result).toEqual(DEFAULT_CELL)
  })

  it('should handle non-half-block cells by converting to half-block', () => {
    const cell: AnsiCell = { char: '#', fg: [...red] as RGBColor, bg: [...blue] as RGBColor }
    // Non-half-block: both halves treated as bg color (blue)
    const result = computeErasePixelCell(cell, true)
    expect(result.char).toBe(HALF_BLOCK)
    expect(result.fg).toEqual(TRANSPARENT_HALF) // top erased
    expect(result.bg).toEqual(blue)             // bottom = original bg
  })

  it('should be idempotent on DEFAULT_CELL', () => {
    const cell: AnsiCell = { ...DEFAULT_CELL }
    const result = computeErasePixelCell(cell, true)
    expect(result).toEqual(DEFAULT_CELL)
  })
})

describe('computeRectCells — eraser mode', () => {
  it('should erase perimeter pixels for outline rect', () => {
    // Pre-paint a 3×3 pixel grid with red on top halves
    const grid = makeGrid()
    for (let r = 0; r <= 1; r++)
      for (let c = 0; c <= 2; c++)
        grid[r][c] = { char: HALF_BLOCK, fg: [...red] as RGBColor, bg: [...blue] as RGBColor }

    const brush = { char: '#', fg: red, bg: DEFAULT_BG, mode: 'eraser' as const }
    // Erase outline: 3px wide × 3px tall (py 0..2, cx 0..2)
    const start = { row: 0, col: 0, isTopHalf: true }
    const end = { row: 1, col: 2, isTopHalf: true }
    const cells = computeRectCells(start, end, brush, grid, false)

    // 8 perimeter pixels across 5 grid cells: row0 (all 3 cols get both halves erased via top+bottom),
    // row1 col0 and col2 get top erased. Interior (py=1,cx=1 → row0 bottom col1) not erased.
    expect(cells.size).toBeGreaterThan(0)
    // Cell at row 0, col 1 has BOTH top (py=0) and bottom (py=1) on perimeter,
    // so both halves erased → DEFAULT_CELL
    // But interior pixel (py=1, cx=1) IS on the perimeter (it's on top row py=0 too...
    // let me think: py goes 0,1,2. Perimeter = py=0, py=2, cx=0, cx=2.
    // py=1, cx=1 is interior, not erased
    // row 0 col 1: has py=0 (top, perimeter) and py=1 (bottom, interior)
    // → top erased, bottom preserved (blue)
    const r0c1 = cells.get('0,1')!
    expect(r0c1.char).toBe(HALF_BLOCK)
    expect(r0c1.fg).toEqual(TRANSPARENT_HALF) // top erased
    expect(r0c1.bg).toEqual(blue)             // bottom preserved (interior)
  })

  it('should revert fully-erased cells to DEFAULT_CELL', () => {
    const grid = makeGrid()
    // Cell at (0,0) has top=red, bottom=transparent
    grid[0][0] = { char: HALF_BLOCK, fg: [...red] as RGBColor, bg: [...TRANSPARENT_HALF] as RGBColor }

    const brush = { char: '#', fg: red, bg: DEFAULT_BG, mode: 'eraser' as const }
    // Erase just the top half at (0,0)
    const start = { row: 0, col: 0, isTopHalf: true }
    const end = { row: 0, col: 0, isTopHalf: true }
    const cells = computeRectCells(start, end, brush, grid, true)

    const cell = cells.get('0,0')!
    expect(cell).toEqual(DEFAULT_CELL)
  })

  it('should erase all pixels in filled rect', () => {
    const grid = makeGrid()
    // Paint a 2×2 cell area (4 pixel rows × 2 cols = 8 pixels)
    for (let r = 0; r <= 1; r++)
      for (let c = 0; c <= 1; c++)
        grid[r][c] = { char: HALF_BLOCK, fg: [...red] as RGBColor, bg: [...blue] as RGBColor }

    const brush = { char: '#', fg: red, bg: DEFAULT_BG, mode: 'eraser' as const }
    const start = { row: 0, col: 0, isTopHalf: true }
    const end = { row: 1, col: 1, isTopHalf: false }
    const cells = computeRectCells(start, end, brush, grid, true)

    // All 4 cells should be erased to DEFAULT_CELL (both halves become DEFAULT_BG)
    expect(cells.size).toBe(4)
    for (const [, cell] of cells) {
      expect(cell).toEqual(DEFAULT_CELL)
    }
  })
})

describe('computeLineCells — eraser mode', () => {
  it('should erase pixels along a horizontal line, preserving other halves', () => {
    const grid = makeGrid()
    // Paint cells with both halves colored
    for (let c = 0; c <= 3; c++)
      grid[0][c] = { char: HALF_BLOCK, fg: [...red] as RGBColor, bg: [...blue] as RGBColor }

    const brush = { char: '#', fg: red, bg: DEFAULT_BG, mode: 'eraser' as const }
    // Erase top half from col 0 to col 3
    const start = { row: 0, col: 0, isTopHalf: true }
    const end = { row: 0, col: 3, isTopHalf: true }
    const cells = computeLineCells(start, end, brush, grid)

    expect(cells.size).toBe(4)
    for (const [, cell] of cells) {
      expect(cell.char).toBe(HALF_BLOCK)
      expect(cell.fg).toEqual(TRANSPARENT_HALF) // top erased
      expect(cell.bg).toEqual(blue)             // bottom preserved
    }
  })
})

describe('computeFloodFillCells — eraser mode', () => {
  it('should erase contiguous pixels of same color', () => {
    // 2×3 grid all top=red, bottom=blue
    const grid = makeSmallGrid(2, 3, { char: HALF_BLOCK, fg: red, bg: blue })
    const brush = { char: HALF_BLOCK, fg: red, bg: [...DEFAULT_BG] as RGBColor, mode: 'eraser' as const }
    // Click top half of (0,0) → target is red; should erase all connected red top-halves
    const cells = computeFloodFillCells(0, 0, brush, grid, true)
    expect(cells.size).toBeGreaterThan(0)
    for (const [, cell] of cells) {
      expect(cell.char).toBe(HALF_BLOCK)
      expect(cell.fg).toEqual(TRANSPARENT_HALF) // top erased
    }
  })

  it('should stop at different-color boundary', () => {
    const grid = makeSmallGrid(3, 3, { char: HALF_BLOCK, fg: red, bg: blue })
    // Middle row top = green (barrier)
    grid[1][0] = { char: HALF_BLOCK, fg: [...green] as RGBColor, bg: [...blue] as RGBColor }
    grid[1][1] = { char: HALF_BLOCK, fg: [...green] as RGBColor, bg: [...blue] as RGBColor }
    grid[1][2] = { char: HALF_BLOCK, fg: [...green] as RGBColor, bg: [...blue] as RGBColor }

    const brush = { char: HALF_BLOCK, fg: red, bg: [...DEFAULT_BG] as RGBColor, mode: 'eraser' as const }
    const cells = computeFloodFillCells(0, 0, brush, grid, true)
    // Only top row top-halves (3 cells)
    expect(cells.size).toBe(3)
    expect(cells.has('0,0')).toBe(true)
    expect(cells.has('0,1')).toBe(true)
    expect(cells.has('0,2')).toBe(true)
    expect(cells.has('1,0')).toBe(false)
  })

  it('should return empty map when target is already DEFAULT_BG (no-op)', () => {
    // Grid of default cells — pixel color is DEFAULT_BG
    const grid = makeSmallGrid(2, 2)
    const brush = { char: HALF_BLOCK, fg: red, bg: [...DEFAULT_BG] as RGBColor, mode: 'eraser' as const }
    const cells = computeFloodFillCells(0, 0, brush, grid, true)
    expect(cells.size).toBe(0)
  })
})
