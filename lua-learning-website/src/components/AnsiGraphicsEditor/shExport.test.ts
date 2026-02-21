import { describe, it, expect } from 'vitest'
import { gridToShString, exportShFile, exportAnimatedShFile } from './shExport'
import type { AnsiCell, AnsiGrid, RGBColor } from './types'
import { ANSI_COLS, ANSI_ROWS, DEFAULT_BG, DEFAULT_FG } from './types'

function makeCell(char: string, fg: RGBColor, bg: RGBColor): AnsiCell {
  return { char, fg, bg }
}

function makeDefaultGrid(): AnsiGrid {
  return Array.from({ length: ANSI_ROWS }, () =>
    Array.from({ length: ANSI_COLS }, () => makeCell(' ', DEFAULT_FG, DEFAULT_BG))
  )
}

function make1x1Grid(cell: AnsiCell): AnsiGrid {
  return [[cell]]
}

// ─── gridToShString ───

describe('gridToShString', () => {
  it('produces correct truecolor escape sequences for a single cell', () => {
    const grid = make1x1Grid(makeCell('A', [255, 0, 0], [0, 0, 255]))
    const result = gridToShString(grid)
    expect(result).toContain('\\033[38;2;255;0;0m')
    expect(result).toContain('\\033[48;2;0;0;255m')
    expect(result).toContain('A')
  })

  it('emits reset at end of each row', () => {
    const grid = make1x1Grid(makeCell('X', [100, 200, 50], [10, 20, 30]))
    const result = gridToShString(grid)
    expect(result).toContain('\\033[0m\\n')
  })

  it('skips redundant fg SGR when consecutive cells share foreground color', () => {
    const grid: AnsiGrid = [[
      makeCell('A', [255, 0, 0], [0, 0, 0]),
      makeCell('B', [255, 0, 0], [0, 0, 255]),
    ]]
    const result = gridToShString(grid)
    // The fg escape should appear once for A, then only bg for B
    const fgSeq = '\\033[38;2;255;0;0m'
    const firstIdx = result.indexOf(fgSeq)
    const secondIdx = result.indexOf(fgSeq, firstIdx + fgSeq.length)
    expect(firstIdx).toBeGreaterThanOrEqual(0)
    expect(secondIdx).toBe(-1) // should not repeat
  })

  it('skips redundant bg SGR when consecutive cells share background color', () => {
    const grid: AnsiGrid = [[
      makeCell('A', [255, 0, 0], [0, 0, 0]),
      makeCell('B', [0, 255, 0], [0, 0, 0]),
    ]]
    const result = gridToShString(grid)
    const bgSeq = '\\033[48;2;0;0;0m'
    const firstIdx = result.indexOf(bgSeq)
    const secondIdx = result.indexOf(bgSeq, firstIdx + bgSeq.length)
    expect(firstIdx).toBeGreaterThanOrEqual(0)
    expect(secondIdx).toBe(-1) // should not repeat
  })

  it('escapes percent character for safe printf embedding', () => {
    const grid = make1x1Grid(makeCell('%', [170, 170, 170], [0, 0, 0]))
    const result = gridToShString(grid)
    expect(result).toContain('%%')
    // Should not contain a lone % that isn't doubled
    const withoutDoubled = result.replace(/%%/g, '')
    // Remaining % should only be in escape sequences (none expected)
    expect(withoutDoubled).not.toContain('%')
  })

  it('escapes backslash character for safe printf embedding', () => {
    const grid = make1x1Grid(makeCell('\\', [170, 170, 170], [0, 0, 0]))
    const result = gridToShString(grid)
    // The character should be escaped as \\\\ in the printf string
    // (since \\033 is already used for escapes, we need to check the char is escaped)
    expect(result).toContain('\\\\')
  })

  it('escapes single quote for safe embedding in single-quoted printf', () => {
    const grid = make1x1Grid(makeCell("'", [170, 170, 170], [0, 0, 0]))
    const result = gridToShString(grid)
    // Single quotes in single-quoted strings are escaped as '\''
    expect(result).toContain("'\\''")
  })

  it('handles full default grid without errors', () => {
    const grid = makeDefaultGrid()
    const result = gridToShString(grid)
    expect(result.length).toBeGreaterThan(0)
    // Should have ANSI_ROWS rows (each ending with \033[0m\n)
    const rowEndings = result.match(/\\033\[0m\\n/g)
    expect(rowEndings).toHaveLength(ANSI_ROWS)
  })

  it('emits characters as Unicode (not CP437)', () => {
    const grid = make1x1Grid(makeCell('█', [255, 255, 255], [0, 0, 0]))
    const result = gridToShString(grid)
    // Should contain the actual Unicode full block character, not a CP437 byte
    expect(result).toContain('█')
  })
})

// ─── exportShFile ───

describe('exportShFile', () => {
  it('starts with bash shebang', () => {
    const grid = make1x1Grid(makeCell('A', [255, 0, 0], [0, 0, 0]))
    const result = exportShFile(grid)
    expect(result).toMatch(/^#!/)
    expect(result).toContain('#!/bin/bash')
  })

  it('clears screen and homes cursor', () => {
    const grid = make1x1Grid(makeCell('A', [255, 0, 0], [0, 0, 0]))
    const result = exportShFile(grid)
    expect(result).toContain("printf '\\033[2J\\033[H'")
  })

  it('ends with a reset sequence', () => {
    const grid = make1x1Grid(makeCell('A', [255, 0, 0], [0, 0, 0]))
    const result = exportShFile(grid)
    expect(result).toContain("printf '\\033[0m'")
  })

  it('wraps grid rows in printf statements', () => {
    const grid: AnsiGrid = [[
      makeCell('A', [255, 0, 0], [0, 0, 255]),
    ]]
    const result = exportShFile(grid)
    // Should have printf with the row content
    expect(result).toContain("printf '")
    expect(result).toContain('\\033[38;2;255;0;0m')
  })

  it('produces valid bash script structure', () => {
    const grid = makeDefaultGrid()
    const result = exportShFile(grid)
    const lines = result.split('\n')
    expect(lines[0]).toBe('#!/bin/bash')
    // Should have printf for clear, rows, and reset
    const printfLines = lines.filter(l => l.startsWith("printf '"))
    expect(printfLines.length).toBeGreaterThanOrEqual(ANSI_ROWS + 2) // clear + rows + reset
  })
})

// ─── exportAnimatedShFile ───

describe('exportAnimatedShFile', () => {
  it('starts with bash shebang', () => {
    const frame1 = make1x1Grid(makeCell('A', [255, 0, 0], [0, 0, 0]))
    const frame2 = make1x1Grid(makeCell('B', [0, 255, 0], [0, 0, 0]))
    const result = exportAnimatedShFile([frame1, frame2], 100)
    expect(result).toMatch(/^#!/)
    expect(result).toContain('#!/bin/bash')
  })

  it('includes trap for clean Ctrl+C exit', () => {
    const frame1 = make1x1Grid(makeCell('A', [255, 0, 0], [0, 0, 0]))
    const frame2 = make1x1Grid(makeCell('B', [0, 255, 0], [0, 0, 0]))
    const result = exportAnimatedShFile([frame1, frame2], 100)
    expect(result).toContain('trap')
    expect(result).toContain('INT')
    expect(result).toContain('\\033[0m')
  })

  it('contains while true loop', () => {
    const frame1 = make1x1Grid(makeCell('A', [255, 0, 0], [0, 0, 0]))
    const frame2 = make1x1Grid(makeCell('B', [0, 255, 0], [0, 0, 0]))
    const result = exportAnimatedShFile([frame1, frame2], 100)
    expect(result).toContain('while true; do')
    expect(result).toContain('done')
  })

  it('includes sleep with correct duration', () => {
    const frame1 = make1x1Grid(makeCell('A', [255, 0, 0], [0, 0, 0]))
    const frame2 = make1x1Grid(makeCell('B', [0, 255, 0], [0, 0, 0]))
    const result = exportAnimatedShFile([frame1, frame2], 100)
    expect(result).toContain('sleep 0.1')
  })

  it('uses correct sleep for 250ms duration', () => {
    const frame1 = make1x1Grid(makeCell('A', [255, 0, 0], [0, 0, 0]))
    const frame2 = make1x1Grid(makeCell('B', [0, 255, 0], [0, 0, 0]))
    const result = exportAnimatedShFile([frame1, frame2], 250)
    expect(result).toContain('sleep 0.25')
  })

  it('homes cursor before each frame', () => {
    const frame1 = make1x1Grid(makeCell('A', [255, 0, 0], [0, 0, 0]))
    const frame2 = make1x1Grid(makeCell('B', [0, 255, 0], [0, 0, 0]))
    const result = exportAnimatedShFile([frame1, frame2], 100)
    // Should have cursor-home for each frame
    const homeMatches = result.match(/\\033\[H/g)
    // At least 2 homes (one per frame in the loop)
    expect(homeMatches!.length).toBeGreaterThanOrEqual(2)
  })

  it('includes content from both frames', () => {
    const frame1 = make1x1Grid(makeCell('A', [255, 0, 0], [0, 0, 0]))
    const frame2 = make1x1Grid(makeCell('B', [0, 255, 0], [0, 0, 0]))
    const result = exportAnimatedShFile([frame1, frame2], 100)
    expect(result).toContain('A')
    expect(result).toContain('B')
  })

  it('falls back to static export for single frame', () => {
    const frame1 = make1x1Grid(makeCell('A', [255, 0, 0], [0, 0, 0]))
    const result = exportAnimatedShFile([frame1], 100)
    // Should NOT have a while loop
    expect(result).not.toContain('while true')
    // Should still be a valid script
    expect(result).toContain('#!/bin/bash')
    expect(result).toContain('A')
  })

  it('falls back to static export for empty frames array', () => {
    const result = exportAnimatedShFile([], 100)
    // Should not crash, produces minimal script
    expect(result).toContain('#!/bin/bash')
    expect(result).not.toContain('while true')
  })

  it('hides cursor during animation and restores on exit', () => {
    const frame1 = make1x1Grid(makeCell('A', [255, 0, 0], [0, 0, 0]))
    const frame2 = make1x1Grid(makeCell('B', [0, 255, 0], [0, 0, 0]))
    const result = exportAnimatedShFile([frame1, frame2], 100)
    // Hide cursor: \033[?25l
    expect(result).toContain('\\033[?25l')
    // Show cursor in trap: \033[?25h
    expect(result).toContain('\\033[?25h')
  })
})
