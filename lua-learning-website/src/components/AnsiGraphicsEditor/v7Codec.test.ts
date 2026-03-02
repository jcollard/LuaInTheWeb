import { describe, it, expect } from 'vitest'
import { buildPalette, encodeGrid, decodeGrid, colorKey } from './v7Codec'
import type { Run } from './v7Codec'
import { ANSI_COLS, ANSI_ROWS, DEFAULT_FG, DEFAULT_BG } from './types'
import type { AnsiGrid, AnsiCell, RGBColor } from './types'

function createDefaultGrid(): AnsiGrid {
  return Array.from({ length: ANSI_ROWS }, () =>
    Array.from({ length: ANSI_COLS }, () => ({
      char: ' ',
      fg: [...DEFAULT_FG] as RGBColor,
      bg: [...DEFAULT_BG] as RGBColor,
    }))
  )
}

function makeCell(char: string, fg: RGBColor, bg: RGBColor): AnsiCell {
  return { char, fg: [...fg] as RGBColor, bg: [...bg] as RGBColor }
}

const RED: RGBColor = [255, 0, 0]
const BLUE: RGBColor = [0, 0, 170]
const GREEN: RGBColor = [0, 255, 0]

describe('colorKey', () => {
  it('produces comma-separated string', () => {
    expect(colorKey([170, 170, 170])).toBe('170,170,170')
    expect(colorKey([0, 0, 0])).toBe('0,0,0')
  })

  it('handles negative values (sentinel colors)', () => {
    expect(colorKey([-1, -1, -1])).toBe('-1,-1,-1')
  })
})

describe('buildPalette', () => {
  it('includes DEFAULT_FG and DEFAULT_BG for empty grids', () => {
    const result = buildPalette([])
    expect(result.palette).toEqual([DEFAULT_FG, DEFAULT_BG])
    expect(result.defaultFgIndex).toBe(1)
    expect(result.defaultBgIndex).toBe(2)
  })

  it('DEFAULT_FG is index 1 and DEFAULT_BG is index 2', () => {
    const grid = createDefaultGrid()
    const result = buildPalette([grid])
    expect(result.defaultFgIndex).toBe(1)
    expect(result.defaultBgIndex).toBe(2)
    expect(result.palette[0]).toEqual(DEFAULT_FG)
    expect(result.palette[1]).toEqual(DEFAULT_BG)
  })

  it('deduplicates identical colors', () => {
    const grid = createDefaultGrid()
    // Paint many cells with the same color
    grid[0][0] = makeCell('A', RED, DEFAULT_BG)
    grid[0][1] = makeCell('B', RED, DEFAULT_BG)
    grid[1][0] = makeCell('C', RED, BLUE)
    const result = buildPalette([grid])
    // DEFAULT_FG, DEFAULT_BG, RED, BLUE = 4 unique colors
    expect(result.palette).toHaveLength(4)
  })

  it('collects colors from multiple grids', () => {
    const grid1 = createDefaultGrid()
    grid1[0][0] = makeCell('A', RED, DEFAULT_BG)
    const grid2 = createDefaultGrid()
    grid2[0][0] = makeCell('B', GREEN, BLUE)
    const result = buildPalette([grid1, grid2])
    // DEFAULT_FG, DEFAULT_BG, RED, GREEN, BLUE = 5
    expect(result.palette).toHaveLength(5)
  })

  it('returns correct indices via colorToIndex', () => {
    const grid = createDefaultGrid()
    grid[0][0] = makeCell('A', RED, BLUE)
    const result = buildPalette([grid])
    expect(result.colorToIndex.get(colorKey(DEFAULT_FG))).toBe(1)
    expect(result.colorToIndex.get(colorKey(DEFAULT_BG))).toBe(2)
    expect(result.colorToIndex.get(colorKey(RED))).toBe(3)
    expect(result.colorToIndex.get(colorKey(BLUE))).toBe(4)
  })
})

describe('encodeGrid', () => {
  function encode(grid: AnsiGrid): Run[] {
    const { colorToIndex } = buildPalette([grid])
    return encodeGrid(grid, colorToIndex)
  }

  it('empty default grid produces empty runs', () => {
    const grid = createDefaultGrid()
    expect(encode(grid)).toEqual([])
  })

  it('single non-default cell produces single cell run', () => {
    const grid = createDefaultGrid()
    grid[2][4] = makeCell('#', RED, BLUE)
    const runs = encode(grid)
    expect(runs).toHaveLength(1)
    // [row=3, col=5, '#', fgIdx, bgIdx] (1-based)
    expect(runs[0]).toHaveLength(5)
    expect(runs[0][0]).toBe(3) // row (1-based)
    expect(runs[0][1]).toBe(5) // col (1-based)
    expect(runs[0][2]).toBe('#')
  })

  it('two identical adjacent cells produce repeat run', () => {
    const grid = createDefaultGrid()
    grid[0][0] = makeCell('#', RED, DEFAULT_BG)
    grid[0][1] = makeCell('#', RED, DEFAULT_BG)
    const runs = encode(grid)
    expect(runs).toHaveLength(1)
    // Repeat run: [row, col, count, char, fgIdx, bgIdx]
    expect(runs[0]).toHaveLength(6)
    expect(runs[0][0]).toBe(1) // row
    expect(runs[0][1]).toBe(1) // col
    expect(runs[0][2]).toBe(2) // count
    expect(runs[0][3]).toBe('#')
  })

  it('two different cells with same fg/bg produce text run', () => {
    const grid = createDefaultGrid()
    grid[0][0] = makeCell('A', RED, DEFAULT_BG)
    grid[0][1] = makeCell('B', RED, DEFAULT_BG)
    const runs = encode(grid)
    expect(runs).toHaveLength(1)
    // Text run: [row, col, "AB", fgIdx, bgIdx]
    expect(runs[0]).toHaveLength(5)
    expect(runs[0][2]).toBe('AB')
  })

  it('mixed content produces multiple run types', () => {
    const grid = createDefaultGrid()
    // Text run: "Hi" in red
    grid[0][0] = makeCell('H', RED, DEFAULT_BG)
    grid[0][1] = makeCell('i', RED, DEFAULT_BG)
    // Repeat run: 3 '#' in blue
    grid[1][0] = makeCell('#', BLUE, DEFAULT_BG)
    grid[1][1] = makeCell('#', BLUE, DEFAULT_BG)
    grid[1][2] = makeCell('#', BLUE, DEFAULT_BG)
    // Single cell
    grid[2][5] = makeCell('@', GREEN, RED)
    const runs = encode(grid)
    expect(runs).toHaveLength(3)
    // First: text run "Hi"
    expect(runs[0]).toHaveLength(5)
    expect(runs[0][2]).toBe('Hi')
    // Second: repeat run '#' x 3
    expect(runs[1]).toHaveLength(6)
    expect(runs[1][2]).toBe(3)
    expect(runs[1][3]).toBe('#')
    // Third: single cell '@'
    expect(runs[2]).toHaveLength(5)
    expect(runs[2][2]).toBe('@')
  })

  it('uses 1-based row/col', () => {
    const grid = createDefaultGrid()
    grid[0][0] = makeCell('A', RED, DEFAULT_BG)
    const runs = encode(grid)
    expect(runs[0][0]).toBe(1) // row 0 → 1
    expect(runs[0][1]).toBe(1) // col 0 → 1
  })

  it('breaks text runs when repeat opportunity appears', () => {
    const grid = createDefaultGrid()
    // Text: A B, then repeat: C C C
    grid[0][0] = makeCell('A', RED, DEFAULT_BG)
    grid[0][1] = makeCell('B', RED, DEFAULT_BG)
    grid[0][2] = makeCell('C', RED, DEFAULT_BG)
    grid[0][3] = makeCell('C', RED, DEFAULT_BG)
    grid[0][4] = makeCell('C', RED, DEFAULT_BG)
    const runs = encode(grid)
    expect(runs).toHaveLength(2)
    // Text run "AB"
    expect(runs[0][2]).toBe('AB')
    // Repeat run "C" x 3
    expect(runs[1][2]).toBe(3)
    expect(runs[1][3]).toBe('C')
  })

  it('handles cells with default fg/bg but non-space char', () => {
    const grid = createDefaultGrid()
    grid[0][0] = makeCell('X', DEFAULT_FG, DEFAULT_BG)
    const runs = encode(grid)
    // char 'X' with default colors is NOT a default cell
    expect(runs).toHaveLength(1)
    expect(runs[0][2]).toBe('X')
  })

  it('handles cells with non-default colors but space char', () => {
    const grid = createDefaultGrid()
    grid[0][0] = makeCell(' ', RED, DEFAULT_BG)
    const runs = encode(grid)
    expect(runs).toHaveLength(1)
    expect(runs[0][2]).toBe(' ')
  })

  it('handles Unicode characters', () => {
    const grid = createDefaultGrid()
    grid[0][0] = makeCell('\u2580', RED, BLUE) // half block
    const runs = encode(grid)
    expect(runs).toHaveLength(1)
    expect(runs[0][2]).toBe('\u2580')
  })
})

describe('decodeGrid', () => {
  const palette: RGBColor[] = [DEFAULT_FG, DEFAULT_BG, RED, BLUE, GREEN]

  it('empty runs produce default grid', () => {
    const grid = decodeGrid([], palette, 1, 2)
    expect(grid).toHaveLength(ANSI_ROWS)
    expect(grid[0]).toHaveLength(ANSI_COLS)
    expect(grid[0][0]).toEqual({ char: ' ', fg: [...DEFAULT_FG], bg: [...DEFAULT_BG] })
    expect(grid[24][79]).toEqual({ char: ' ', fg: [...DEFAULT_FG], bg: [...DEFAULT_BG] })
  })

  it('single cell run placed correctly (1-based)', () => {
    const runs: Run[] = [[3, 5, '#', 3, 4]] // row 3, col 5 → grid[2][4]
    const grid = decodeGrid(runs, palette, 1, 2)
    expect(grid[2][4]).toEqual({ char: '#', fg: [...RED], bg: [...BLUE] })
    // Adjacent cells remain default
    expect(grid[2][3]).toEqual({ char: ' ', fg: [...DEFAULT_FG], bg: [...DEFAULT_BG] })
    expect(grid[2][5]).toEqual({ char: ' ', fg: [...DEFAULT_FG], bg: [...DEFAULT_BG] })
  })

  it('text run placed correctly', () => {
    const runs: Run[] = [[1, 1, 'Hello', 3, 2]] // row 1, col 1
    const grid = decodeGrid(runs, palette, 1, 2)
    expect(grid[0][0].char).toBe('H')
    expect(grid[0][1].char).toBe('e')
    expect(grid[0][2].char).toBe('l')
    expect(grid[0][3].char).toBe('l')
    expect(grid[0][4].char).toBe('o')
    // All cells in the run have the same fg/bg
    for (let i = 0; i < 5; i++) {
      expect(grid[0][i].fg).toEqual([...RED])
      expect(grid[0][i].bg).toEqual([...DEFAULT_BG])
    }
    // Next cell is default
    expect(grid[0][5]).toEqual({ char: ' ', fg: [...DEFAULT_FG], bg: [...DEFAULT_BG] })
  })

  it('repeat run placed correctly', () => {
    const runs: Run[] = [[2, 10, 5, '#', 3, 4]] // row 2, col 10, count 5
    const grid = decodeGrid(runs, palette, 1, 2)
    for (let i = 0; i < 5; i++) {
      expect(grid[1][9 + i]).toEqual({ char: '#', fg: [...RED], bg: [...BLUE] })
    }
    // Before and after are default
    expect(grid[1][8]).toEqual({ char: ' ', fg: [...DEFAULT_FG], bg: [...DEFAULT_BG] })
    expect(grid[1][14]).toEqual({ char: ' ', fg: [...DEFAULT_FG], bg: [...DEFAULT_BG] })
  })

  it('multiple runs from different rows', () => {
    const runs: Run[] = [
      [1, 1, 'AB', 3, 2],       // text run row 1
      [3, 5, '#', 4, 2],        // single cell row 3
      [5, 1, 3, '*', 5, 4],     // repeat run row 5
    ]
    const grid = decodeGrid(runs, palette, 1, 2)
    expect(grid[0][0].char).toBe('A')
    expect(grid[0][1].char).toBe('B')
    expect(grid[2][4].char).toBe('#')
    expect(grid[4][0].char).toBe('*')
    expect(grid[4][1].char).toBe('*')
    expect(grid[4][2].char).toBe('*')
  })

  it('throws on out-of-range defaultFgIndex (0)', () => {
    expect(() => decodeGrid([], palette, 0, 2)).toThrow('defaultFgIndex')
  })

  it('throws on out-of-range defaultFgIndex (exceeds palette length)', () => {
    expect(() => decodeGrid([], palette, palette.length + 1, 2)).toThrow('defaultFgIndex')
  })

  it('throws on out-of-range defaultBgIndex (0)', () => {
    expect(() => decodeGrid([], palette, 1, 0)).toThrow('defaultBgIndex')
  })

  it('throws on out-of-range defaultBgIndex (exceeds palette length)', () => {
    expect(() => decodeGrid([], palette, 1, palette.length + 1)).toThrow('defaultBgIndex')
  })

  it('throws on negative defaultFgIndex', () => {
    expect(() => decodeGrid([], palette, -1, 2)).toThrow('defaultFgIndex')
  })

  it('throws on negative defaultBgIndex', () => {
    expect(() => decodeGrid([], palette, 1, -1)).toThrow('defaultBgIndex')
  })

  it('skips runs with out-of-range fgIdx in single cell run', () => {
    // fgIdx 99 is way beyond palette length
    const runs: Run[] = [[1, 1, '#', 99, 2]]
    const grid = decodeGrid(runs, palette, 1, 2)
    // Cell should remain default because the run was skipped
    expect(grid[0][0]).toEqual({ char: ' ', fg: [...DEFAULT_FG], bg: [...DEFAULT_BG] })
  })

  it('skips runs with out-of-range bgIdx in single cell run', () => {
    const runs: Run[] = [[1, 1, '#', 3, 99]]
    const grid = decodeGrid(runs, palette, 1, 2)
    expect(grid[0][0]).toEqual({ char: ' ', fg: [...DEFAULT_FG], bg: [...DEFAULT_BG] })
  })

  it('skips runs with out-of-range fgIdx in repeat run', () => {
    const runs: Run[] = [[1, 1, 3, '#', 99, 2]]
    const grid = decodeGrid(runs, palette, 1, 2)
    // All cells should remain default
    expect(grid[0][0]).toEqual({ char: ' ', fg: [...DEFAULT_FG], bg: [...DEFAULT_BG] })
    expect(grid[0][1]).toEqual({ char: ' ', fg: [...DEFAULT_FG], bg: [...DEFAULT_BG] })
    expect(grid[0][2]).toEqual({ char: ' ', fg: [...DEFAULT_FG], bg: [...DEFAULT_BG] })
  })

  it('skips runs with out-of-range bgIdx in repeat run', () => {
    const runs: Run[] = [[1, 1, 3, '#', 3, 99]]
    const grid = decodeGrid(runs, palette, 1, 2)
    expect(grid[0][0]).toEqual({ char: ' ', fg: [...DEFAULT_FG], bg: [...DEFAULT_BG] })
  })

  it('skips runs with out-of-range fgIdx in text run', () => {
    const runs: Run[] = [[1, 1, 'Hi', 99, 2]]
    const grid = decodeGrid(runs, palette, 1, 2)
    expect(grid[0][0]).toEqual({ char: ' ', fg: [...DEFAULT_FG], bg: [...DEFAULT_BG] })
    expect(grid[0][1]).toEqual({ char: ' ', fg: [...DEFAULT_FG], bg: [...DEFAULT_BG] })
  })

  it('skips runs with zero fgIdx', () => {
    const runs: Run[] = [[1, 1, '#', 0, 2]]
    const grid = decodeGrid(runs, palette, 1, 2)
    expect(grid[0][0]).toEqual({ char: ' ', fg: [...DEFAULT_FG], bg: [...DEFAULT_BG] })
  })

  it('skips runs with zero bgIdx', () => {
    const runs: Run[] = [[1, 1, '#', 3, 0]]
    const grid = decodeGrid(runs, palette, 1, 2)
    expect(grid[0][0]).toEqual({ char: ' ', fg: [...DEFAULT_FG], bg: [...DEFAULT_BG] })
  })
})

describe('round-trip encode/decode', () => {
  function roundTrip(grid: AnsiGrid): AnsiGrid {
    const { palette, colorToIndex, defaultFgIndex, defaultBgIndex } = buildPalette([grid])
    const runs = encodeGrid(grid, colorToIndex)
    return decodeGrid(runs, palette, defaultFgIndex, defaultBgIndex)
  }

  it('empty grid round-trips', () => {
    const grid = createDefaultGrid()
    const result = roundTrip(grid)
    expect(result).toEqual(grid)
  })

  it('sparse grid round-trips', () => {
    const grid = createDefaultGrid()
    grid[5][10] = makeCell('@', RED, BLUE)
    grid[20][70] = makeCell('Z', GREEN, DEFAULT_BG)
    const result = roundTrip(grid)
    expect(result[5][10]).toEqual(grid[5][10])
    expect(result[20][70]).toEqual(grid[20][70])
    // Default cells preserved
    expect(result[0][0]).toEqual({ char: ' ', fg: [...DEFAULT_FG], bg: [...DEFAULT_BG] })
  })

  it('dense grid round-trips', () => {
    const grid = createDefaultGrid()
    // Fill an entire row with non-default content
    for (let c = 0; c < ANSI_COLS; c++) {
      grid[0][c] = makeCell(String.fromCharCode(65 + (c % 26)), RED, BLUE)
    }
    const result = roundTrip(grid)
    for (let c = 0; c < ANSI_COLS; c++) {
      expect(result[0][c]).toEqual(grid[0][c])
    }
  })

  it('grid with repeat runs round-trips', () => {
    const grid = createDefaultGrid()
    // Row of identical characters
    for (let c = 0; c < 20; c++) {
      grid[3][c] = makeCell('#', RED, BLUE)
    }
    const result = roundTrip(grid)
    for (let c = 0; c < 20; c++) {
      expect(result[3][c]).toEqual(grid[3][c])
    }
  })

  it('grid with mixed run types round-trips', () => {
    const grid = createDefaultGrid()
    // Text run
    grid[0][0] = makeCell('H', RED, DEFAULT_BG)
    grid[0][1] = makeCell('i', RED, DEFAULT_BG)
    // Gap (default)
    // Repeat run
    grid[0][10] = makeCell('#', BLUE, DEFAULT_BG)
    grid[0][11] = makeCell('#', BLUE, DEFAULT_BG)
    grid[0][12] = makeCell('#', BLUE, DEFAULT_BG)
    // Single cell
    grid[5][40] = makeCell('@', GREEN, RED)
    const result = roundTrip(grid)
    expect(result[0][0]).toEqual(grid[0][0])
    expect(result[0][1]).toEqual(grid[0][1])
    expect(result[0][10]).toEqual(grid[0][10])
    expect(result[0][11]).toEqual(grid[0][11])
    expect(result[0][12]).toEqual(grid[0][12])
    expect(result[5][40]).toEqual(grid[5][40])
  })

  it('grid with Unicode characters round-trips', () => {
    const grid = createDefaultGrid()
    grid[0][0] = makeCell('\u2580', RED, BLUE) // half block
    grid[0][1] = makeCell('\u2580', RED, BLUE)
    const result = roundTrip(grid)
    expect(result[0][0]).toEqual(grid[0][0])
    expect(result[0][1]).toEqual(grid[0][1])
  })

  it('full grid (all non-default) round-trips', () => {
    const grid: AnsiGrid = Array.from({ length: ANSI_ROWS }, () =>
      Array.from({ length: ANSI_COLS }, () => makeCell('#', RED, BLUE))
    )
    const result = roundTrip(grid)
    for (let r = 0; r < ANSI_ROWS; r++) {
      for (let c = 0; c < ANSI_COLS; c++) {
        expect(result[r][c]).toEqual(grid[r][c])
      }
    }
  })

  it('single-row content round-trips', () => {
    const grid = createDefaultGrid()
    grid[12][0] = makeCell('X', RED, DEFAULT_BG)
    grid[12][79] = makeCell('Y', BLUE, DEFAULT_BG)
    const result = roundTrip(grid)
    expect(result[12][0]).toEqual(grid[12][0])
    expect(result[12][79]).toEqual(grid[12][79])
  })
})
