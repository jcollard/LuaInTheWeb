import { describe, it, expect } from 'vitest'
import { renderGridToAnsiString } from '../src/ansiStringRenderer'
import type { AnsiGrid, AnsiCell, RGBColor } from '../src/screenTypes'
import { DEFAULT_FG, DEFAULT_BG, HALF_BLOCK, ANSI_ROWS, ANSI_COLS } from '../src/screenTypes'

function makeCell(char: string, fg: RGBColor, bg: RGBColor): AnsiCell {
  return { char, fg, bg }
}

function makeGrid(rows: number, cols: number, fill: AnsiCell): AnsiGrid {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ ...fill, fg: [...fill.fg] as RGBColor, bg: [...fill.bg] as RGBColor }))
  )
}

describe('renderGridToAnsiString', () => {
  it('renders a 1x1 grid with correct escape sequences', () => {
    const grid: AnsiGrid = [[makeCell('A', [255, 0, 0], [0, 0, 255])]]
    const result = renderGridToAnsiString(grid)

    expect(result).toContain('\x1b[H\x1b[0m')       // cursor home + reset
    expect(result).toContain('\x1b[1;1H')            // row 1 positioning
    expect(result).toContain('\x1b[38;2;255;0;0m')   // fg red
    expect(result).toContain('\x1b[48;2;0;0;255m')   // bg blue
    expect(result).toContain('A')                     // character
    expect(result).toMatch(/\x1b\[0m$/)              // reset at end
  })

  it('skips redundant color changes for consecutive same-color cells', () => {
    const cell = makeCell('X', [100, 200, 50], [10, 20, 30])
    const grid: AnsiGrid = [[cell, { ...cell }, { ...cell }]]
    const result = renderGridToAnsiString(grid)

    // Count fg color sequences - should only appear once
    const fgMatches = result.match(/\x1b\[38;2;100;200;50m/g)
    expect(fgMatches).toHaveLength(1)

    // Count bg color sequences - should only appear once
    const bgMatches = result.match(/\x1b\[48;2;10;20;30m/g)
    expect(bgMatches).toHaveLength(1)

    // Should have 3 X characters
    const xMatches = result.match(/X/g)
    expect(xMatches).toHaveLength(3)
  })

  it('emits new color codes when colors change between cells', () => {
    const grid: AnsiGrid = [[
      makeCell('A', [255, 0, 0], [0, 0, 0]),
      makeCell('B', [0, 255, 0], [0, 0, 0]),
    ]]
    const result = renderGridToAnsiString(grid)

    expect(result).toContain('\x1b[38;2;255;0;0m')
    expect(result).toContain('\x1b[38;2;0;255;0m')
    // bg should only appear once since both are the same
    const bgMatches = result.match(/\x1b\[48;2;0;0;0m/g)
    expect(bgMatches).toHaveLength(1)
  })

  it('handles HALF_BLOCK characters', () => {
    const grid: AnsiGrid = [[makeCell(HALF_BLOCK, [255, 255, 255], [0, 0, 0])]]
    const result = renderGridToAnsiString(grid)
    expect(result).toContain(HALF_BLOCK)
  })

  it('positions cursor at each row start', () => {
    const grid = makeGrid(3, 2, makeCell(' ', DEFAULT_FG, DEFAULT_BG))
    const result = renderGridToAnsiString(grid)

    expect(result).toContain('\x1b[1;1H')
    expect(result).toContain('\x1b[2;1H')
    expect(result).toContain('\x1b[3;1H')
  })

  it('clamps to ANSI_ROWS x ANSI_COLS', () => {
    // Oversized grid should only render up to bounds
    const grid = makeGrid(30, 85, makeCell('Z', [0, 0, 0], [0, 0, 0]))
    const result = renderGridToAnsiString(grid)

    // Should not have row 26 positioning
    expect(result).not.toContain('\x1b[26;1H')
    // Should have row 25
    expect(result).toContain('\x1b[25;1H')
    // Count Z characters: 25 rows * 80 cols = 2000
    const zCount = (result.match(/Z/g) ?? []).length
    expect(zCount).toBe(ANSI_ROWS * ANSI_COLS)
  })

  it('handles empty grid', () => {
    const grid: AnsiGrid = []
    const result = renderGridToAnsiString(grid)
    // Should still have initial positioning and reset
    expect(result).toContain('\x1b[H\x1b[0m')
    expect(result).toMatch(/\x1b\[0m$/)
  })

  it('resets colors between rows', () => {
    const grid: AnsiGrid = [
      [makeCell('A', [255, 0, 0], [0, 0, 0])],
      [makeCell('B', [255, 0, 0], [0, 0, 0])],
    ]
    const result = renderGridToAnsiString(grid)
    // fg color set once (same across rows), should not repeat
    const fgMatches = result.match(/\x1b\[38;2;255;0;0m/g)
    expect(fgMatches).toHaveLength(1)
  })
})
