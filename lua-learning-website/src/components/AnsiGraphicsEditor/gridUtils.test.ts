import { describe, it, expect } from 'vitest'
import { computeRectCells } from './gridUtils'
import type { AnsiGrid, RGBColor } from './types'
import { ANSI_ROWS, ANSI_COLS, DEFAULT_FG, DEFAULT_BG, HALF_BLOCK } from './types'

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

describe('computeRectCells', () => {
  describe('brush mode — outline', () => {
    it('should produce only perimeter cells for a 3×4 rect', () => {
      const grid = makeGrid()
      const brush = { char: '#', fg: red, bg: blue, mode: 'brush' as const }
      const start = { row: 1, col: 2, isTopHalf: true }
      const end = { row: 3, col: 5, isTopHalf: true }
      const cells = computeRectCells(start, end, brush, grid, false)

      // Perimeter: top row (cols 2-5), bottom row (cols 2-5), left/right cols of interior rows
      // Top row: (1,2) (1,3) (1,4) (1,5) = 4
      // Bottom row: (3,2) (3,3) (3,4) (3,5) = 4
      // Interior row 2: left (2,2), right (2,5) = 2
      // Total = 10
      expect(cells.size).toBe(10)

      // Top row all present
      for (let c = 2; c <= 5; c++) {
        expect(cells.has(`1,${c}`)).toBe(true)
      }
      // Bottom row all present
      for (let c = 2; c <= 5; c++) {
        expect(cells.has(`3,${c}`)).toBe(true)
      }
      // Interior row: only edges
      expect(cells.has('2,2')).toBe(true)
      expect(cells.has('2,5')).toBe(true)
      expect(cells.has('2,3')).toBe(false)
      expect(cells.has('2,4')).toBe(false)

      // Verify cell content
      const cell = cells.get('1,2')!
      expect(cell.char).toBe('#')
      expect(cell.fg).toEqual(red)
      expect(cell.bg).toEqual(blue)
    })

    it('should handle reversed start/end (end before start)', () => {
      const grid = makeGrid()
      const brush = { char: '#', fg: red, bg: blue, mode: 'brush' as const }
      // end is top-left of start
      const start = { row: 3, col: 5, isTopHalf: true }
      const end = { row: 1, col: 2, isTopHalf: true }
      const cells = computeRectCells(start, end, brush, grid, false)

      expect(cells.size).toBe(10)
      expect(cells.has('1,2')).toBe(true)
      expect(cells.has('3,5')).toBe(true)
    })
  })

  describe('brush mode — filled', () => {
    it('should produce all cells in the bounding box', () => {
      const grid = makeGrid()
      const brush = { char: '#', fg: red, bg: blue, mode: 'brush' as const }
      const start = { row: 1, col: 2, isTopHalf: true }
      const end = { row: 3, col: 5, isTopHalf: true }
      const cells = computeRectCells(start, end, brush, grid, true)

      // 3 rows × 4 cols = 12
      expect(cells.size).toBe(12)
      for (let r = 1; r <= 3; r++) {
        for (let c = 2; c <= 5; c++) {
          const cell = cells.get(`${r},${c}`)
          expect(cell).toBeDefined()
          expect(cell!.char).toBe('#')
        }
      }
    })
  })

  describe('single-cell rect', () => {
    it('should produce exactly one cell when start equals end', () => {
      const grid = makeGrid()
      const brush = { char: '@', fg: red, bg: blue, mode: 'brush' as const }
      const point = { row: 5, col: 10, isTopHalf: true }
      const cells = computeRectCells(point, point, brush, grid, false)

      expect(cells.size).toBe(1)
      expect(cells.get('5,10')!.char).toBe('@')
    })

    it('should produce exactly one cell for filled single-cell rect', () => {
      const grid = makeGrid()
      const brush = { char: '@', fg: red, bg: blue, mode: 'brush' as const }
      const point = { row: 5, col: 10, isTopHalf: true }
      const cells = computeRectCells(point, point, brush, grid, true)

      expect(cells.size).toBe(1)
      expect(cells.get('5,10')!.char).toBe('@')
    })
  })

  describe('pixel mode — outline', () => {
    it('should produce perimeter pixels only', () => {
      const grid = makeGrid()
      const brush = { char: '#', fg: red, bg: DEFAULT_BG, mode: 'pixel' as const }
      // 3 pixel-rows × 3 pixel-cols: rows 0-2, cols 0-2
      // Start: row 0 top (pixelY 0), col 0
      // End: row 1 top (pixelY 2), col 2
      const start = { row: 0, col: 0, isTopHalf: true }
      const end = { row: 1, col: 2, isTopHalf: true }
      const cells = computeRectCells(start, end, brush, grid, false)

      // Perimeter of a 3×3 pixel grid = 8 pixels
      // Top row: (py=0, cx=0,1,2) → 3 pixels
      // Bottom row: (py=2, cx=0,1,2) → 3 pixels
      // Left/right of interior: (py=1, cx=0), (py=1, cx=2) → 2 pixels
      // Total unique pixels = 8
      // They map to grid cells: row 0 (pixelY 0,1) and row 1 (pixelY 2)
      // All cells should be HALF_BLOCK
      for (const [, cell] of cells) {
        expect(cell.char).toBe(HALF_BLOCK)
      }
    })

    it('should not fill interior pixels for outline', () => {
      const grid = makeGrid()
      const brush = { char: '#', fg: red, bg: DEFAULT_BG, mode: 'pixel' as const }
      // 5 pixel-rows × 5 pixel-cols
      // Start: row 0 top (py=0), col 0
      // End: row 2 top (py=4), col 4
      const start = { row: 0, col: 0, isTopHalf: true }
      const end = { row: 2, col: 4, isTopHalf: true }
      const cells = computeRectCells(start, end, brush, grid, false)

      // Perimeter of 5×5 = 16 pixels
      // Interior: (py 1-3, cx 1-3) = 9 pixels should NOT be present
      // Total cells affected may overlap (two pixels in same cell)
      // The key check: interior pixel (py=2, cx=2) → row=1, col=2, top half
      // Should NOT be painted
      // Let's check that the cell at row 1, col 2 doesn't have the fg color set to red
      // unless it's also a perimeter pixel
      // py=2, cx=2 is interior; row=1, isTop=true
      // The cell at 1,2 might have perimeter pixels too: py=1 (cx=2 interior left/right? no, cx=2 is interior)
      // py=1 cx=2 is also interior. So cell (1,2) should not be in the map at all.
      expect(cells.has('1,2')).toBe(false)
    })
  })

  describe('pixel mode — filled', () => {
    it('should fill all pixels in the bounding box', () => {
      const grid = makeGrid()
      const brush = { char: '#', fg: red, bg: DEFAULT_BG, mode: 'pixel' as const }
      // 2 pixel-rows × 3 pixel-cols
      const start = { row: 0, col: 0, isTopHalf: true }
      const end = { row: 0, col: 2, isTopHalf: false }
      const cells = computeRectCells(start, end, brush, grid, true)

      // pixelY 0-1, cols 0-2 → 6 pixels → 3 grid cells (each with top+bottom)
      expect(cells.size).toBe(3)
      for (let c = 0; c <= 2; c++) {
        const cell = cells.get(`0,${c}`)
        expect(cell).toBeDefined()
        expect(cell!.char).toBe(HALF_BLOCK)
        expect(cell!.fg).toEqual(red)  // top half
        expect(cell!.bg).toEqual(red)  // bottom half
      }
    })
  })

  describe('out-of-bounds handling', () => {
    it('should skip cells that are out of bounds', () => {
      const grid = makeGrid()
      const brush = { char: '#', fg: red, bg: blue, mode: 'brush' as const }
      // Start at last row/col, end beyond grid bounds
      const start = { row: ANSI_ROWS - 1, col: ANSI_COLS - 1, isTopHalf: true }
      const end = { row: ANSI_ROWS - 1, col: ANSI_COLS - 1, isTopHalf: true }
      const cells = computeRectCells(start, end, brush, grid, false)

      expect(cells.size).toBe(1)
      expect(cells.has(`${ANSI_ROWS - 1},${ANSI_COLS - 1}`)).toBe(true)
    })
  })

  describe('horizontal and vertical line rects', () => {
    it('should produce a horizontal line for a 1-row rect', () => {
      const grid = makeGrid()
      const brush = { char: '#', fg: red, bg: blue, mode: 'brush' as const }
      const start = { row: 5, col: 0, isTopHalf: true }
      const end = { row: 5, col: 4, isTopHalf: true }
      const cells = computeRectCells(start, end, brush, grid, false)

      expect(cells.size).toBe(5)
      for (let c = 0; c <= 4; c++) {
        expect(cells.has(`5,${c}`)).toBe(true)
      }
    })

    it('should produce a vertical line for a 1-col rect', () => {
      const grid = makeGrid()
      const brush = { char: '#', fg: red, bg: blue, mode: 'brush' as const }
      const start = { row: 0, col: 3, isTopHalf: true }
      const end = { row: 4, col: 3, isTopHalf: true }
      const cells = computeRectCells(start, end, brush, grid, false)

      expect(cells.size).toBe(5)
      for (let r = 0; r <= 4; r++) {
        expect(cells.has(`${r},3`)).toBe(true)
      }
    })
  })
})
