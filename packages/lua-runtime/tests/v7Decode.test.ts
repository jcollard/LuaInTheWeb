import { describe, it, expect } from 'vitest'
import { parseV7Palette, decodeV7Grid } from '../src/v7Decode'
import type { RGBColor } from '../src/screenTypes'
import { DEFAULT_FG, DEFAULT_BG, ANSI_ROWS, ANSI_COLS } from '../src/screenTypes'

describe('parseV7Palette', () => {
  it('parses palette from wasmoon 1-indexed format', () => {
    const raw = { 1: { 1: 170, 2: 170, 3: 170 }, 2: { 1: 0, 2: 0, 3: 0 } }
    const palette = parseV7Palette(raw)
    expect(palette).toEqual([[170, 170, 170], [0, 0, 0]])
  })

  it('handles JS array format', () => {
    const raw = [[255, 0, 0], [0, 255, 0]]
    const palette = parseV7Palette(raw)
    expect(palette).toEqual([[255, 0, 0], [0, 255, 0]])
  })

  it('handles empty input', () => {
    expect(parseV7Palette(null)).toEqual([])
    expect(parseV7Palette(undefined)).toEqual([])
    expect(parseV7Palette({})).toEqual([])
  })
})

describe('decodeV7Grid', () => {
  const palette: RGBColor[] = [DEFAULT_FG, DEFAULT_BG, [255, 0, 0], [0, 0, 170]]

  it('empty runs produce default grid', () => {
    const grid = decodeV7Grid({}, palette, 1, 2)
    expect(grid.length).toBe(ANSI_ROWS)
    expect(grid[0].length).toBe(ANSI_COLS)
    expect(grid[0][0]).toEqual({ char: ' ', fg: [...DEFAULT_FG], bg: [...DEFAULT_BG] })
  })

  it('decodes single cell run from 1-indexed object', () => {
    // Single cell: {row=3, col=5, char='#', fgIdx=3, bgIdx=4}
    const rawRuns = { 1: { 1: 3, 2: 5, 3: '#', 4: 3, 5: 4 } }
    const grid = decodeV7Grid(rawRuns, palette, 1, 2)
    expect(grid[2][4]).toEqual({ char: '#', fg: [255, 0, 0], bg: [0, 0, 170] })
    // Adjacent cells remain default
    expect(grid[2][3]).toEqual({ char: ' ', fg: [...DEFAULT_FG], bg: [...DEFAULT_BG] })
  })

  it('decodes text run from 1-indexed object', () => {
    // Text run: {row=1, col=1, text="Hi", fgIdx=3, bgIdx=2}
    const rawRuns = { 1: { 1: 1, 2: 1, 3: 'Hi', 4: 3, 5: 2 } }
    const grid = decodeV7Grid(rawRuns, palette, 1, 2)
    expect(grid[0][0]).toEqual({ char: 'H', fg: [255, 0, 0], bg: [...DEFAULT_BG] })
    expect(grid[0][1]).toEqual({ char: 'i', fg: [255, 0, 0], bg: [...DEFAULT_BG] })
    expect(grid[0][2]).toEqual({ char: ' ', fg: [...DEFAULT_FG], bg: [...DEFAULT_BG] })
  })

  it('decodes repeat run from 1-indexed object', () => {
    // Repeat run: {row=2, col=1, count=5, char='#', fgIdx=3, bgIdx=4}
    const rawRuns = { 1: { 1: 2, 2: 1, 3: 5, 4: '#', 5: 3, 6: 4 } }
    const grid = decodeV7Grid(rawRuns, palette, 1, 2)
    for (let i = 0; i < 5; i++) {
      expect(grid[1][i]).toEqual({ char: '#', fg: [255, 0, 0], bg: [0, 0, 170] })
    }
    // Cell after the repeat should be default
    expect(grid[1][5]).toEqual({ char: ' ', fg: [...DEFAULT_FG], bg: [...DEFAULT_BG] })
  })

  it('handles JS array format for runs', () => {
    const rawRuns = [[3, 5, '#', 3, 4]]
    const grid = decodeV7Grid(rawRuns, palette, 1, 2)
    expect(grid[2][4]).toEqual({ char: '#', fg: [255, 0, 0], bg: [0, 0, 170] })
  })

  it('handles multiple run types together', () => {
    const rawRuns = {
      1: { 1: 1, 2: 1, 3: 'AB', 4: 3, 5: 2 },      // text run
      2: { 1: 2, 2: 1, 3: 3, 4: '#', 5: 3, 6: 4 },  // repeat run
      3: { 1: 3, 2: 5, 3: '@', 4: 3, 5: 2 },         // single cell
    }
    const grid = decodeV7Grid(rawRuns, palette, 1, 2)
    expect(grid[0][0].char).toBe('A')
    expect(grid[0][1].char).toBe('B')
    expect(grid[1][0].char).toBe('#')
    expect(grid[1][1].char).toBe('#')
    expect(grid[1][2].char).toBe('#')
    expect(grid[2][4].char).toBe('@')
  })

  it('null/undefined runs produce default grid', () => {
    const grid = decodeV7Grid(null, palette, 1, 2)
    expect(grid.length).toBe(ANSI_ROWS)
    expect(grid[0][0]).toEqual({ char: ' ', fg: [...DEFAULT_FG], bg: [...DEFAULT_BG] })
  })
})
