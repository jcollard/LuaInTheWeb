import { describe, it, expect } from 'vitest'
import { renderGridToAnsiString, renderDiffAnsiString } from '../src/ansiStringRenderer'
import type { AnsiGrid, AnsiCell, RGBColor } from '../src/screenTypes'
import { DEFAULT_FG, DEFAULT_BG, HALF_BLOCK, ANSI_ROWS, ANSI_COLS } from '../src/screenTypes'

const ESC = '\x1b'

function makeCell(char: string, fg: RGBColor, bg: RGBColor): AnsiCell {
  return { char, fg, bg }
}

function makeGrid(rows: number, cols: number, fill: AnsiCell): AnsiGrid {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ ...fill, fg: [...fill.fg] as RGBColor, bg: [...fill.bg] as RGBColor }))
  )
}

/** Count occurrences of a literal substring in a string. */
function countOccurrences(haystack: string, needle: string): number {
  let count = 0
  let pos = 0
  while ((pos = haystack.indexOf(needle, pos)) !== -1) {
    count++
    pos += needle.length
  }
  return count
}

describe('renderGridToAnsiString', () => {
  it('renders a 1x1 grid with correct escape sequences', () => {
    const grid: AnsiGrid = [[makeCell('A', [255, 0, 0], [0, 0, 255])]]
    const result = renderGridToAnsiString(grid)

    expect(result).toContain(`${ESC}[H${ESC}[0m`)       // cursor home + reset
    expect(result).toContain(`${ESC}[1;1H`)              // row 1 positioning
    expect(result).toContain(`${ESC}[38;2;255;0;0m`)     // fg red
    expect(result).toContain(`${ESC}[48;2;0;0;255m`)     // bg blue
    expect(result).toContain('A')                         // character
    expect(result.endsWith(`${ESC}[0m`)).toBe(true)       // reset at end
  })

  it('skips redundant color changes for consecutive same-color cells', () => {
    const cell = makeCell('X', [100, 200, 50], [10, 20, 30])
    const grid: AnsiGrid = [[cell, { ...cell }, { ...cell }]]
    const result = renderGridToAnsiString(grid)

    // Count fg color sequences - should only appear once
    expect(countOccurrences(result, `${ESC}[38;2;100;200;50m`)).toBe(1)

    // Count bg color sequences - should only appear once
    expect(countOccurrences(result, `${ESC}[48;2;10;20;30m`)).toBe(1)

    // Should have 3 X characters
    expect(countOccurrences(result, 'X')).toBe(3)
  })

  it('emits new color codes when colors change between cells', () => {
    const grid: AnsiGrid = [[
      makeCell('A', [255, 0, 0], [0, 0, 0]),
      makeCell('B', [0, 255, 0], [0, 0, 0]),
    ]]
    const result = renderGridToAnsiString(grid)

    expect(result).toContain(`${ESC}[38;2;255;0;0m`)
    expect(result).toContain(`${ESC}[38;2;0;255;0m`)
    // bg should only appear once since both are the same
    expect(countOccurrences(result, `${ESC}[48;2;0;0;0m`)).toBe(1)
  })

  it('handles HALF_BLOCK characters', () => {
    const grid: AnsiGrid = [[makeCell(HALF_BLOCK, [255, 255, 255], [0, 0, 0])]]
    const result = renderGridToAnsiString(grid)
    expect(result).toContain(HALF_BLOCK)
  })

  it('positions cursor at each row start', () => {
    const grid = makeGrid(3, 2, makeCell(' ', DEFAULT_FG, DEFAULT_BG))
    const result = renderGridToAnsiString(grid)

    expect(result).toContain(`${ESC}[1;1H`)
    expect(result).toContain(`${ESC}[2;1H`)
    expect(result).toContain(`${ESC}[3;1H`)
  })

  it('clamps to ANSI_ROWS x ANSI_COLS', () => {
    // Oversized grid should only render up to bounds
    const grid = makeGrid(30, 85, makeCell('Z', [0, 0, 0], [0, 0, 0]))
    const result = renderGridToAnsiString(grid)

    // Should not have row 26 positioning
    expect(result).not.toContain(`${ESC}[26;1H`)
    // Should have row 25
    expect(result).toContain(`${ESC}[25;1H`)
    // Count Z characters: 25 rows * 80 cols = 2000
    expect(countOccurrences(result, 'Z')).toBe(ANSI_ROWS * ANSI_COLS)
  })

  it('handles empty grid', () => {
    const grid: AnsiGrid = []
    const result = renderGridToAnsiString(grid)
    // Should still have initial positioning and reset
    expect(result).toContain(`${ESC}[H${ESC}[0m`)
    expect(result.endsWith(`${ESC}[0m`)).toBe(true)
  })

  it('resets colors between rows', () => {
    const grid: AnsiGrid = [
      [makeCell('A', [255, 0, 0], [0, 0, 0])],
      [makeCell('B', [255, 0, 0], [0, 0, 0])],
    ]
    const result = renderGridToAnsiString(grid)
    // fg color set once (same across rows), should not repeat
    expect(countOccurrences(result, `${ESC}[38;2;255;0;0m`)).toBe(1)
  })
})

describe('renderDiffAnsiString', () => {
  it('returns null when grids are identical', () => {
    const grid = makeGrid(2, 2, makeCell('A', [255, 0, 0], [0, 0, 255]))
    const result = renderDiffAnsiString(grid, grid)
    expect(result).toBeNull()
  })

  it('returns null for identical grids with same values but different references', () => {
    const oldGrid = makeGrid(2, 2, makeCell('A', [255, 0, 0], [0, 0, 255]))
    const newGrid = makeGrid(2, 2, makeCell('A', [255, 0, 0], [0, 0, 255]))
    const result = renderDiffAnsiString(oldGrid, newGrid)
    expect(result).toBeNull()
  })

  it('emits cursor positioning and colors for a changed cell', () => {
    const oldGrid = makeGrid(1, 3, makeCell('A', DEFAULT_FG, DEFAULT_BG))
    const newGrid = makeGrid(1, 3, makeCell('A', DEFAULT_FG, DEFAULT_BG))
    // Change middle cell
    newGrid[0][1] = makeCell('B', [255, 0, 0], [0, 0, 255])

    const result = renderDiffAnsiString(oldGrid, newGrid)
    expect(result).not.toBeNull()
    // Should position cursor at row 1, col 2 (1-based)
    expect(result).toContain(`${ESC}[1;2H`)
    expect(result).toContain(`${ESC}[38;2;255;0;0m`)
    expect(result).toContain(`${ESC}[48;2;0;0;255m`)
    expect(result).toContain('B')
  })

  it('only emits escapes for changed cells, not unchanged', () => {
    const oldGrid = makeGrid(1, 3, makeCell('A', DEFAULT_FG, DEFAULT_BG))
    const newGrid = makeGrid(1, 3, makeCell('A', DEFAULT_FG, DEFAULT_BG))
    newGrid[0][2] = makeCell('Z', [0, 255, 0], [0, 0, 0])

    const result = renderDiffAnsiString(oldGrid, newGrid)!
    // Should not contain the character 'A' (unchanged cells not emitted)
    // The result should be short — only one cell changed
    expect(countOccurrences(result, 'Z')).toBe(1)
    // Should position at col 3
    expect(result).toContain(`${ESC}[1;3H`)
  })

  it('handles changes across multiple rows', () => {
    const oldGrid = makeGrid(3, 2, makeCell('A', DEFAULT_FG, DEFAULT_BG))
    const newGrid = makeGrid(3, 2, makeCell('A', DEFAULT_FG, DEFAULT_BG))
    newGrid[0][0] = makeCell('X', [255, 0, 0], DEFAULT_BG)
    newGrid[2][1] = makeCell('Y', [0, 255, 0], DEFAULT_BG)

    const result = renderDiffAnsiString(oldGrid, newGrid)!
    expect(result).toContain(`${ESC}[1;1H`)
    expect(result).toContain('X')
    expect(result).toContain(`${ESC}[3;2H`)
    expect(result).toContain('Y')
  })

  it('skips redundant color changes between consecutive changed cells', () => {
    const oldGrid = makeGrid(1, 3, makeCell('A', DEFAULT_FG, DEFAULT_BG))
    const newGrid = makeGrid(1, 3, makeCell('A', DEFAULT_FG, DEFAULT_BG))
    // Change all three cells to same color
    newGrid[0][0] = makeCell('X', [255, 0, 0], [0, 0, 255])
    newGrid[0][1] = makeCell('Y', [255, 0, 0], [0, 0, 255])
    newGrid[0][2] = makeCell('Z', [255, 0, 0], [0, 0, 255])

    const result = renderDiffAnsiString(oldGrid, newGrid)!
    // Color should appear only once since all changed cells share the same color
    expect(countOccurrences(result, `${ESC}[38;2;255;0;0m`)).toBe(1)
    expect(countOccurrences(result, `${ESC}[48;2;0;0;255m`)).toBe(1)
  })

  it('detects change when only char differs', () => {
    const oldGrid: AnsiGrid = [[makeCell('A', DEFAULT_FG, DEFAULT_BG)]]
    const newGrid: AnsiGrid = [[makeCell('B', DEFAULT_FG, DEFAULT_BG)]]
    const result = renderDiffAnsiString(oldGrid, newGrid)
    expect(result).not.toBeNull()
    expect(result).toContain('B')
  })

  it('detects change when only fg differs', () => {
    const oldGrid: AnsiGrid = [[makeCell('A', [0, 0, 0], DEFAULT_BG)]]
    const newGrid: AnsiGrid = [[makeCell('A', [255, 0, 0], DEFAULT_BG)]]
    const result = renderDiffAnsiString(oldGrid, newGrid)
    expect(result).not.toBeNull()
    expect(result).toContain(`${ESC}[38;2;255;0;0m`)
  })

  it('detects change when only bg differs', () => {
    const oldGrid: AnsiGrid = [[makeCell('A', DEFAULT_FG, [0, 0, 0])]]
    const newGrid: AnsiGrid = [[makeCell('A', DEFAULT_FG, [0, 0, 255])]]
    const result = renderDiffAnsiString(oldGrid, newGrid)
    expect(result).not.toBeNull()
    expect(result).toContain(`${ESC}[48;2;0;0;255m`)
  })

  it('ends with reset escape sequence', () => {
    const oldGrid: AnsiGrid = [[makeCell('A', DEFAULT_FG, DEFAULT_BG)]]
    const newGrid: AnsiGrid = [[makeCell('B', [255, 0, 0], DEFAULT_BG)]]
    const result = renderDiffAnsiString(oldGrid, newGrid)!
    expect(result.endsWith(`${ESC}[0m`)).toBe(true)
  })

  it('handles empty grids', () => {
    const result = renderDiffAnsiString([], [])
    expect(result).toBeNull()
  })

  it('clamps to ANSI_ROWS x ANSI_COLS', () => {
    const oldGrid = makeGrid(30, 85, makeCell('A', DEFAULT_FG, DEFAULT_BG))
    const newGrid = makeGrid(30, 85, makeCell('A', DEFAULT_FG, DEFAULT_BG))
    // Change a cell beyond bounds — should not appear
    newGrid[26][81] = makeCell('Z', [255, 0, 0], DEFAULT_BG)
    // Change a cell within bounds — should appear
    newGrid[0][0] = makeCell('X', [255, 0, 0], DEFAULT_BG)

    const result = renderDiffAnsiString(oldGrid, newGrid)!
    expect(result).toContain('X')
    expect(result).not.toContain('Z')
  })
})
