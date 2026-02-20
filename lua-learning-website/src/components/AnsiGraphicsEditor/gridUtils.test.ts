import { describe, it, expect, vi } from 'vitest'
import { computeRectCells, computeFloodFillCells, computeErasePixelCell, computeLineCells, computeBorderCells, writeCellToTerminal, renderFullGrid } from './gridUtils'
import type { ColorTransform } from './gridUtils'
import type { AnsiCell, AnsiGrid, RGBColor } from './types'
import { ANSI_ROWS, ANSI_COLS, DEFAULT_FG, DEFAULT_BG, DEFAULT_CELL, HALF_BLOCK, TRANSPARENT_HALF, BORDER_PRESETS } from './types'
import type { AnsiTerminalHandle } from '../AnsiTerminalPanel/AnsiTerminalPanel'

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

const green: RGBColor = [0, 170, 0]

function makeSmallGrid(rows: number, cols: number, cell?: AnsiCell): AnsiGrid {
  const c = cell ?? { char: ' ', fg: [...DEFAULT_FG] as RGBColor, bg: [...DEFAULT_BG] as RGBColor }
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ ...c, fg: [...c.fg] as RGBColor, bg: [...c.bg] as RGBColor }))
  )
}

describe('computeFloodFillCells', () => {
  describe('brush mode', () => {
    it('should fill contiguous region of same char/fg/bg', () => {
      // 3×3 grid all '#' red/blue — fill from (0,0) with '@' green/blue
      const grid = makeSmallGrid(3, 3, { char: '#', fg: red, bg: blue })
      const brush = { char: '@', fg: green, bg: blue, mode: 'brush' as const }
      const cells = computeFloodFillCells(0, 0, brush, grid)
      // All 9 cells should be filled
      expect(cells.size).toBe(9)
      for (const [, cell] of cells) {
        expect(cell.char).toBe('@')
        expect(cell.fg).toEqual(green)
        expect(cell.bg).toEqual(blue)
      }
    })

    it('should stop at cells with different char', () => {
      // 3×3 grid: row 1 has 'X' instead of '#'
      const grid = makeSmallGrid(3, 3, { char: '#', fg: red, bg: blue })
      grid[1][0] = { char: 'X', fg: [...red] as RGBColor, bg: [...blue] as RGBColor }
      grid[1][1] = { char: 'X', fg: [...red] as RGBColor, bg: [...blue] as RGBColor }
      grid[1][2] = { char: 'X', fg: [...red] as RGBColor, bg: [...blue] as RGBColor }
      const brush = { char: '@', fg: green, bg: blue, mode: 'brush' as const }
      const cells = computeFloodFillCells(0, 0, brush, grid)
      // Only top row (3 cells) should be filled
      expect(cells.size).toBe(3)
      expect(cells.has('0,0')).toBe(true)
      expect(cells.has('0,1')).toBe(true)
      expect(cells.has('0,2')).toBe(true)
      expect(cells.has('1,0')).toBe(false)
    })

    it('should stop at cells with different fg color', () => {
      const grid = makeSmallGrid(3, 3, { char: '#', fg: red, bg: blue })
      // Column 1 has different fg
      grid[0][1] = { char: '#', fg: [...green] as RGBColor, bg: [...blue] as RGBColor }
      grid[1][1] = { char: '#', fg: [...green] as RGBColor, bg: [...blue] as RGBColor }
      grid[2][1] = { char: '#', fg: [...green] as RGBColor, bg: [...blue] as RGBColor }
      const brush = { char: '@', fg: green, bg: blue, mode: 'brush' as const }
      const cells = computeFloodFillCells(0, 0, brush, grid)
      // Only column 0 should be filled (3 cells) — column 1 blocks, column 2 unreachable
      expect(cells.size).toBe(3)
      expect(cells.has('0,0')).toBe(true)
      expect(cells.has('1,0')).toBe(true)
      expect(cells.has('2,0')).toBe(true)
      expect(cells.has('0,2')).toBe(false)
    })

    it('should stop at cells with different bg color', () => {
      const grid = makeSmallGrid(3, 3, { char: '#', fg: red, bg: blue })
      // Row 1 has different bg
      for (let c = 0; c < 3; c++) {
        grid[1][c] = { char: '#', fg: [...red] as RGBColor, bg: [...green] as RGBColor }
      }
      const brush = { char: '@', fg: green, bg: blue, mode: 'brush' as const }
      const cells = computeFloodFillCells(2, 0, brush, grid)
      // Only bottom row (3 cells) — row 1 blocks
      expect(cells.size).toBe(3)
      expect(cells.has('2,0')).toBe(true)
      expect(cells.has('2,1')).toBe(true)
      expect(cells.has('2,2')).toBe(true)
      expect(cells.has('0,0')).toBe(false)
    })

    it('should return empty map when target matches brush (no-op)', () => {
      const grid = makeSmallGrid(3, 3, { char: '@', fg: green, bg: blue })
      const brush = { char: '@', fg: green, bg: blue, mode: 'brush' as const }
      const cells = computeFloodFillCells(1, 1, brush, grid)
      expect(cells.size).toBe(0)
    })

    it('should respect grid boundaries (no out-of-bounds)', () => {
      // Use full-size grid, fill from corner
      const grid = makeGrid()
      // Paint a 2×2 block at top-left with red
      for (let r = 0; r < 2; r++)
        for (let c = 0; c < 2; c++)
          grid[r][c] = { char: '#', fg: [...red] as RGBColor, bg: [...blue] as RGBColor }
      const brush = { char: '@', fg: green, bg: blue, mode: 'brush' as const }
      const cells = computeFloodFillCells(0, 0, brush, grid)
      expect(cells.size).toBe(4)
      expect(cells.has('0,0')).toBe(true)
      expect(cells.has('0,1')).toBe(true)
      expect(cells.has('1,0')).toBe(true)
      expect(cells.has('1,1')).toBe(true)
    })
  })

  describe('pixel mode', () => {
    it('should fill contiguous pixels of same color', () => {
      // 2×3 grid of half-block cells, all fg=red bg=blue
      // That gives a 4×3 pixel grid (2 rows × 2 halves each × 3 cols)
      const grid = makeSmallGrid(2, 3, { char: HALF_BLOCK, fg: red, bg: blue })
      const brush = { char: HALF_BLOCK, fg: green, bg: [...DEFAULT_BG] as RGBColor, mode: 'pixel' as const }
      // Click on top half of (0,0) → target color is red (fg of half-block top)
      const cells = computeFloodFillCells(0, 0, brush, grid, true)
      // All top halves are red → should fill all 6 top pixels
      // But bottom halves are blue, not red, so they won't be filled
      expect(cells.size).toBe(3) // 3 cells affected (top half only, rows=0)
      for (const [, cell] of cells) {
        expect(cell.char).toBe(HALF_BLOCK)
        expect(cell.fg).toEqual(green) // top half painted
      }
    })

    it('should stop at pixels with different color', () => {
      // 3×3 grid of half-blocks, all top=red
      const grid = makeSmallGrid(3, 3, { char: HALF_BLOCK, fg: red, bg: blue })
      // Make middle row top pixel green (different color)
      grid[1][0] = { char: HALF_BLOCK, fg: [...green] as RGBColor, bg: [...blue] as RGBColor }
      grid[1][1] = { char: HALF_BLOCK, fg: [...green] as RGBColor, bg: [...blue] as RGBColor }
      grid[1][2] = { char: HALF_BLOCK, fg: [...green] as RGBColor, bg: [...blue] as RGBColor }
      const brush = { char: HALF_BLOCK, fg: [...DEFAULT_FG] as RGBColor, bg: [...DEFAULT_BG] as RGBColor, mode: 'pixel' as const }
      // Click top half of (0,0) → target red; row 1 top is green so it blocks
      const cells = computeFloodFillCells(0, 0, brush, grid, true)
      // Only top row top-half pixels (3 cells)
      expect(cells.size).toBe(3)
      expect(cells.has('0,0')).toBe(true)
      expect(cells.has('0,1')).toBe(true)
      expect(cells.has('0,2')).toBe(true)
      expect(cells.has('1,0')).toBe(false)
    })

    it('should return empty map when target color matches brush fg', () => {
      const grid = makeSmallGrid(2, 2, { char: HALF_BLOCK, fg: red, bg: blue })
      const brush = { char: HALF_BLOCK, fg: red, bg: [...DEFAULT_BG] as RGBColor, mode: 'pixel' as const }
      // Click on top half → target=red, brush.fg=red → no-op
      const cells = computeFloodFillCells(0, 0, brush, grid, true)
      expect(cells.size).toBe(0)
    })

    it('should handle non-half-block cells (treats both halves as bg)', () => {
      // Grid of regular space cells (non-half-block): both halves = bg
      const grid = makeSmallGrid(2, 2, { char: ' ', fg: [...DEFAULT_FG] as RGBColor, bg: [...red] as RGBColor })
      const brush = { char: HALF_BLOCK, fg: green, bg: [...DEFAULT_BG] as RGBColor, mode: 'pixel' as const }
      // Click top half of (0,0) → non-half-block, so pixel color = bg = red
      const cells = computeFloodFillCells(0, 0, brush, grid, true)
      // Both top and bottom halves read as red (bg), so all 4 pixel rows × 2 cols = 8 pixels should fill
      // That maps to all 4 grid cells
      expect(cells.size).toBe(4)
    })

    it('should fill only brush-drawn cells and not spread to empty cells with same bg', () => {
      // 3×3 grid: top row is brush-drawn '#' with fg=red, bg=DEFAULT_BG
      // remaining rows are empty DEFAULT_CELL (also has bg=DEFAULT_BG)
      const grid = makeSmallGrid(3, 3)
      grid[0][0] = { char: '#', fg: [...red] as RGBColor, bg: [...DEFAULT_BG] as RGBColor }
      grid[0][1] = { char: '#', fg: [...red] as RGBColor, bg: [...DEFAULT_BG] as RGBColor }
      grid[0][2] = { char: '#', fg: [...red] as RGBColor, bg: [...DEFAULT_BG] as RGBColor }
      const brush = { char: HALF_BLOCK, fg: green, bg: [...DEFAULT_BG] as RGBColor, mode: 'pixel' as const }
      // Click on the '#' area — should fill only the 3 '#' cells, not empty cells
      const cells = computeFloodFillCells(0, 0, brush, grid, true)
      expect(cells.size).toBe(3)
      expect(cells.has('0,0')).toBe(true)
      expect(cells.has('0,1')).toBe(true)
      expect(cells.has('0,2')).toBe(true)
      expect(cells.has('1,0')).toBe(false) // empty cell should NOT be filled
    })

    it('should fill brush-drawn cells with different char as separate regions', () => {
      // Row of '#' followed by '@' — different chars should not connect
      const grid = makeSmallGrid(1, 4)
      grid[0][0] = { char: '#', fg: [...red] as RGBColor, bg: [...DEFAULT_BG] as RGBColor }
      grid[0][1] = { char: '#', fg: [...red] as RGBColor, bg: [...DEFAULT_BG] as RGBColor }
      grid[0][2] = { char: '@', fg: [...red] as RGBColor, bg: [...DEFAULT_BG] as RGBColor }
      grid[0][3] = { char: '@', fg: [...red] as RGBColor, bg: [...DEFAULT_BG] as RGBColor }
      const brush = { char: HALF_BLOCK, fg: green, bg: [...DEFAULT_BG] as RGBColor, mode: 'pixel' as const }
      const cells = computeFloodFillCells(0, 0, brush, grid, true)
      expect(cells.size).toBe(2) // only the '#' cells
      expect(cells.has('0,0')).toBe(true)
      expect(cells.has('0,1')).toBe(true)
      expect(cells.has('0,2')).toBe(false)
    })

    it('should erase only brush-drawn cells and not spread to empty cells', () => {
      const grid = makeSmallGrid(2, 2)
      grid[0][0] = { char: '#', fg: [...red] as RGBColor, bg: [...DEFAULT_BG] as RGBColor }
      grid[0][1] = { char: '#', fg: [...red] as RGBColor, bg: [...DEFAULT_BG] as RGBColor }
      const brush = { char: HALF_BLOCK, fg: red, bg: [...DEFAULT_BG] as RGBColor, mode: 'eraser' as const }
      const cells = computeFloodFillCells(0, 0, brush, grid, true)
      expect(cells.size).toBe(2)
      expect(cells.has('0,0')).toBe(true)
      expect(cells.has('0,1')).toBe(true)
      expect(cells.has('1,0')).toBe(false)
    })
  })
})

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

function mockHandle(): AnsiTerminalHandle {
  return { write: vi.fn(), container: document.createElement('div') } as unknown as AnsiTerminalHandle
}

describe('writeCellToTerminal with colorTransform', () => {
  it('should apply colorTransform to fg and bg before writing', () => {
    const handle = mockHandle()
    const transform: ColorTransform = () => [0, 0, 0]
    const cell = { char: 'A', fg: [255, 0, 0] as RGBColor, bg: [0, 255, 0] as RGBColor }
    writeCellToTerminal(handle, 0, 0, cell, transform)
    // The written string should contain rgb(0,0,0) for both fg and bg
    const written = (handle.write as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(written).toContain('38;2;0;0;0')
    expect(written).toContain('48;2;0;0;0')
    expect(written).not.toContain('38;2;255;0;0')
  })

  it('should pass colors through unchanged when no transform is provided', () => {
    const handle = mockHandle()
    const cell = { char: 'A', fg: [255, 0, 0] as RGBColor, bg: [0, 255, 0] as RGBColor }
    writeCellToTerminal(handle, 0, 0, cell)
    const written = (handle.write as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(written).toContain('38;2;255;0;0')
    expect(written).toContain('48;2;0;255;0')
  })
})

describe('renderFullGrid with colorTransform', () => {
  it('should pass colorTransform through to writeCellToTerminal calls', () => {
    const handle = mockHandle()
    const grid = makeSmallGrid(ANSI_ROWS, ANSI_COLS)
    grid[0][0] = { char: 'X', fg: [255, 0, 0] as RGBColor, bg: [0, 0, 255] as RGBColor }
    const transform: ColorTransform = (c) => [c[0], c[1], 0]
    renderFullGrid(handle, grid, transform)
    const calls = (handle.write as ReturnType<typeof vi.fn>).mock.calls
    const allWritten = calls.map((c: unknown[]) => c[0] as string).join('')
    // The red fg should become [255,0,0] → [255,0,0] (unchanged r,g but b=0)
    expect(allWritten).toContain('38;2;255;0;0')
    // The blue bg [0,0,255] should become [0,0,0]
    expect(allWritten).toContain('48;2;0;0;0')
    expect(allWritten).not.toContain('48;2;0;0;255')
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
