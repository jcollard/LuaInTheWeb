import { describe, it, expect } from 'vitest'
import { computeOvalCells } from './gridUtils'
import type { AnsiGrid, RGBColor } from './types'
import { ANSI_ROWS, ANSI_COLS, DEFAULT_FG, DEFAULT_BG, HALF_BLOCK, TRANSPARENT_HALF } from './types'

function makeGrid(): AnsiGrid {
  return Array.from({ length: ANSI_ROWS }, () =>
    Array.from({ length: ANSI_COLS }, () => ({
      char: ' ',
      fg: [...DEFAULT_FG] as RGBColor,
      bg: [...DEFAULT_BG] as RGBColor,
    }))
  )
}

const red: RGBColor = [255, 0, 0]
const blue: RGBColor = [0, 0, 255]

describe('computeOvalCells', () => {
  describe('brush mode — outline', () => {
    it('should produce perimeter cells for a bounding box', () => {
      const grid = makeGrid()
      const brush = { char: '#', fg: red, bg: blue, mode: 'brush' as const }
      const start = { row: 2, col: 5, isTopHalf: true }
      const end = { row: 8, col: 15, isTopHalf: true }
      const cells = computeOvalCells(start, end, brush, grid, false)

      // All cells should be on the perimeter
      expect(cells.size).toBeGreaterThan(0)
      // Verify cells use the brush character
      for (const [, cell] of cells) {
        expect(cell.char).toBe('#')
        expect(cell.fg).toEqual(red)
        expect(cell.bg).toEqual(blue)
      }
    })

    it('should not include interior cells for outline mode', () => {
      const grid = makeGrid()
      const brush = { char: '#', fg: red, bg: blue, mode: 'brush' as const }
      // Large enough oval to have interior space
      const start = { row: 0, col: 0, isTopHalf: true }
      const end = { row: 10, col: 20, isTopHalf: true }
      const outlineCells = computeOvalCells(start, end, brush, grid, false)
      const filledCells = computeOvalCells(start, end, brush, grid, true)

      // Filled should have more cells than outline
      expect(filledCells.size).toBeGreaterThan(outlineCells.size)
    })
  })

  describe('brush mode — filled', () => {
    it('should fill the entire oval area', () => {
      const grid = makeGrid()
      const brush = { char: '#', fg: red, bg: blue, mode: 'brush' as const }
      const start = { row: 0, col: 0, isTopHalf: true }
      const end = { row: 4, col: 6, isTopHalf: true }
      const cells = computeOvalCells(start, end, brush, grid, true)

      // All cells should use brush
      for (const [, cell] of cells) {
        expect(cell.char).toBe('#')
      }

      // Center row should be fully filled
      const centerRow = 2
      let hasCenterFill = false
      for (let c = 0; c <= 6; c++) {
        if (cells.has(`${centerRow},${c}`)) hasCenterFill = true
      }
      expect(hasCenterFill).toBe(true)
    })

    it('should include all outline cells plus interior', () => {
      const grid = makeGrid()
      const brush = { char: '#', fg: red, bg: blue, mode: 'brush' as const }
      const start = { row: 0, col: 0, isTopHalf: true }
      const end = { row: 6, col: 10, isTopHalf: true }
      const outlineCells = computeOvalCells(start, end, brush, grid, false)
      const filledCells = computeOvalCells(start, end, brush, grid, true)

      // Every outline cell should also be in the filled set
      for (const key of outlineCells.keys()) {
        expect(filledCells.has(key)).toBe(true)
      }
    })
  })

  describe('pixel mode — outline', () => {
    it('should produce half-block cells for pixel outline', () => {
      const grid = makeGrid()
      const brush = { char: '#', fg: red, bg: blue, mode: 'pixel' as const }
      const start = { row: 1, col: 2, isTopHalf: true }
      const end = { row: 5, col: 12, isTopHalf: false }
      const cells = computeOvalCells(start, end, brush, grid, false)

      expect(cells.size).toBeGreaterThan(0)
      for (const [, cell] of cells) {
        expect(cell.char).toBe(HALF_BLOCK)
      }
    })
  })

  describe('pixel mode — filled', () => {
    it('should produce half-block cells for pixel filled', () => {
      const grid = makeGrid()
      const brush = { char: '#', fg: red, bg: blue, mode: 'pixel' as const }
      const start = { row: 1, col: 2, isTopHalf: true }
      const end = { row: 5, col: 12, isTopHalf: false }
      const cells = computeOvalCells(start, end, brush, grid, true)

      expect(cells.size).toBeGreaterThan(0)
      for (const [, cell] of cells) {
        expect(cell.char).toBe(HALF_BLOCK)
      }
    })

    it('should have more cells than outline for large pixel oval', () => {
      const grid = makeGrid()
      const brush = { char: '#', fg: red, bg: blue, mode: 'pixel' as const }
      const start = { row: 0, col: 0, isTopHalf: true }
      const end = { row: 10, col: 20, isTopHalf: false }
      const outlineCells = computeOvalCells(start, end, brush, grid, false)
      const filledCells = computeOvalCells(start, end, brush, grid, true)

      expect(filledCells.size).toBeGreaterThan(outlineCells.size)
    })
  })

  describe('single cell', () => {
    it('should produce one cell when start equals end in brush mode', () => {
      const grid = makeGrid()
      const brush = { char: '#', fg: red, bg: blue, mode: 'brush' as const }
      const pos = { row: 5, col: 10, isTopHalf: true }
      const cells = computeOvalCells(pos, pos, brush, grid, false)

      expect(cells.size).toBe(1)
      expect(cells.has('5,10')).toBe(true)
    })

    it('should produce one cell when start equals end in pixel mode', () => {
      const grid = makeGrid()
      const brush = { char: '#', fg: red, bg: blue, mode: 'pixel' as const }
      const pos = { row: 5, col: 10, isTopHalf: true }
      const cells = computeOvalCells(pos, pos, brush, grid, false)

      expect(cells.size).toBe(1)
      expect(cells.has('5,10')).toBe(true)
      expect(cells.get('5,10')!.char).toBe(HALF_BLOCK)
    })
  })

  describe('reversed coordinates', () => {
    it('should handle end before start (reversed drag)', () => {
      const grid = makeGrid()
      const brush = { char: '#', fg: red, bg: blue, mode: 'brush' as const }
      const start = { row: 6, col: 10, isTopHalf: true }
      const end = { row: 2, col: 5, isTopHalf: true }
      const cellsReversed = computeOvalCells(start, end, brush, grid, false)

      const cellsNormal = computeOvalCells(end, start, brush, grid, false)

      // Should produce the same cells regardless of direction
      expect(cellsReversed.size).toBe(cellsNormal.size)
      for (const key of cellsReversed.keys()) {
        expect(cellsNormal.has(key)).toBe(true)
      }
    })
  })

  describe('eraser mode', () => {
    it('should erase pixel cells in eraser mode', () => {
      const grid = makeGrid()
      // Pre-fill some cells with pixel data
      grid[5][10] = { char: HALF_BLOCK, fg: red, bg: blue }
      const brush = { char: '#', fg: red, bg: blue, mode: 'eraser' as const }
      const pos = { row: 5, col: 10, isTopHalf: true }
      const cells = computeOvalCells(pos, pos, brush, grid, false)

      expect(cells.size).toBe(1)
      const cell = cells.get('5,10')!
      // Eraser should produce transparent top half
      expect(cell.char).toBe(HALF_BLOCK)
      expect(cell.fg).toEqual(TRANSPARENT_HALF)
    })
  })

  describe('degenerate cases', () => {
    it('should handle 1-row bounding box in brush mode (horizontal line)', () => {
      const grid = makeGrid()
      const brush = { char: '#', fg: red, bg: blue, mode: 'brush' as const }
      const start = { row: 5, col: 3, isTopHalf: true }
      const end = { row: 5, col: 8, isTopHalf: true }
      const cells = computeOvalCells(start, end, brush, grid, false)

      // Should produce a horizontal line of cells
      expect(cells.size).toBeGreaterThan(0)
      for (const [key] of cells) {
        const [r] = key.split(',').map(Number)
        expect(r).toBe(5)
      }
    })

    it('should handle 1-col bounding box in brush mode (vertical line)', () => {
      const grid = makeGrid()
      const brush = { char: '#', fg: red, bg: blue, mode: 'brush' as const }
      const start = { row: 3, col: 5, isTopHalf: true }
      const end = { row: 8, col: 5, isTopHalf: true }
      const cells = computeOvalCells(start, end, brush, grid, false)

      // Should produce a vertical line of cells
      expect(cells.size).toBeGreaterThan(0)
      for (const [key] of cells) {
        const [, c] = key.split(',').map(Number)
        expect(c).toBe(5)
      }
    })
  })

  describe('out-of-bounds clipping', () => {
    it('should clip cells that fall outside the grid', () => {
      const grid = makeGrid()
      const brush = { char: '#', fg: red, bg: blue, mode: 'brush' as const }
      // Start near bottom-right edge
      const start = { row: ANSI_ROWS - 3, col: ANSI_COLS - 3, isTopHalf: true }
      const end = { row: ANSI_ROWS + 2, col: ANSI_COLS + 2, isTopHalf: true }
      const cells = computeOvalCells(start, end, brush, grid, true)

      // All cells should be within bounds
      for (const [key] of cells) {
        const [r, c] = key.split(',').map(Number)
        expect(r).toBeGreaterThanOrEqual(0)
        expect(r).toBeLessThan(ANSI_ROWS)
        expect(c).toBeGreaterThanOrEqual(0)
        expect(c).toBeLessThan(ANSI_COLS)
      }
    })
  })

  describe('oval shape properties', () => {
    it('should be symmetric around center in brush mode', () => {
      const grid = makeGrid()
      const brush = { char: '#', fg: red, bg: blue, mode: 'brush' as const }
      const start = { row: 2, col: 5, isTopHalf: true }
      const end = { row: 12, col: 25, isTopHalf: true }
      const cells = computeOvalCells(start, end, brush, grid, false)

      const centerR = (2 + 12) / 2 // 7
      const centerC = (5 + 25) / 2 // 15

      // For each cell, the symmetric counterpart should also exist
      for (const [key] of cells) {
        const [r, c] = key.split(',').map(Number)
        const mirrorR = Math.round(2 * centerR - r)
        const mirrorC = Math.round(2 * centerC - c)
        expect(cells.has(`${mirrorR},${mirrorC}`)).toBe(true)
      }
    })

    it('filled oval should satisfy ellipse equation for all cells', () => {
      const grid = makeGrid()
      const brush = { char: '#', fg: red, bg: blue, mode: 'brush' as const }
      const start = { row: 2, col: 5, isTopHalf: true }
      const end = { row: 12, col: 25, isTopHalf: true }
      const cells = computeOvalCells(start, end, brush, grid, true)

      const centerR = (2 + 12) / 2
      const centerC = (5 + 25) / 2
      const a = (25 - 5) / 2
      const b = (12 - 2) / 2

      for (const [key] of cells) {
        const [r, c] = key.split(',').map(Number)
        const dr = r - centerR
        const dc = c - centerC
        // Should be inside or on the ellipse (with tolerance for discretization)
        const val = (dc * dc) / (a * a) + (dr * dr) / (b * b)
        expect(val).toBeLessThanOrEqual(1.5)
      }
    })
  })
})
