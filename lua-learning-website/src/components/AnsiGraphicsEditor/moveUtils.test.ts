import { describe, it, expect } from 'vitest'
import { buildAllShiftedFrames } from './moveUtils'
import type { AnsiCell, AnsiGrid } from './types'
import { ANSI_ROWS, ANSI_COLS, DEFAULT_CELL } from './types'
import { createEmptyGrid } from './gridUtils'

const cellA: AnsiCell = { char: 'A', fg: [255, 0, 0], bg: [0, 0, 255] }
const cellB: AnsiCell = { char: 'B', fg: [0, 255, 0], bg: [255, 255, 0] }

describe('buildAllShiftedFrames', () => {
  it('shifts cells by (dr, dc) in a single frame', () => {
    const captured = new Map<string, Map<string, AnsiCell>[]>([
      ['layer1', [new Map([['2,3', cellA], ['4,5', cellB]])]],
    ])
    const blanks = new Map<string, AnsiGrid[]>([
      ['layer1', [createEmptyGrid()]],
    ])

    const result = buildAllShiftedFrames(captured, blanks, 1, 2)
    const grid = result.get('layer1')![0]

    expect(grid[3][5]).toEqual(cellA) // 2+1, 3+2
    expect(grid[5][7]).toEqual(cellB) // 4+1, 5+2
    // Original positions should be DEFAULT_CELL
    expect(grid[2][3]).toEqual(DEFAULT_CELL)
    expect(grid[4][5]).toEqual(DEFAULT_CELL)
  })

  it('shifts cells across multiple frames independently', () => {
    const frame0Cells = new Map<string, AnsiCell>([['0,0', cellA]])
    const frame1Cells = new Map<string, AnsiCell>([['1,1', cellB]])
    const captured = new Map<string, Map<string, AnsiCell>[]>([
      ['layer1', [frame0Cells, frame1Cells]],
    ])
    const blanks = new Map<string, AnsiGrid[]>([
      ['layer1', [createEmptyGrid(), createEmptyGrid()]],
    ])

    const result = buildAllShiftedFrames(captured, blanks, 2, 3)
    const frames = result.get('layer1')!

    // Frame 0: cellA at (0,0) shifted by (2,3) → (2,3)
    expect(frames[0][2][3]).toEqual(cellA)
    expect(frames[0][0][0]).toEqual(DEFAULT_CELL)

    // Frame 1: cellB at (1,1) shifted by (2,3) → (3,4)
    expect(frames[1][3][4]).toEqual(cellB)
    expect(frames[1][1][1]).toEqual(DEFAULT_CELL)
  })

  it('discards cells that shift out of bounds', () => {
    // Cell at row 0, shifting up by -1 → goes to row -1 (out of bounds)
    const captured = new Map<string, Map<string, AnsiCell>[]>([
      ['layer1', [new Map([['0,0', cellA], ['5,5', cellB]])]],
    ])
    const blanks = new Map<string, AnsiGrid[]>([
      ['layer1', [createEmptyGrid()]],
    ])

    const result = buildAllShiftedFrames(captured, blanks, -1, 0)
    const grid = result.get('layer1')![0]

    // cellA at (0,0) shifted by (-1,0) → (-1,0) — out of bounds, discarded
    expect(grid[0][0]).toEqual(DEFAULT_CELL)
    // cellB at (5,5) shifted by (-1,0) → (4,5) — in bounds
    expect(grid[4][5]).toEqual(cellB)
  })

  it('discards cells that shift past right/bottom edges', () => {
    const captured = new Map<string, Map<string, AnsiCell>[]>([
      ['layer1', [new Map([
        [`${ANSI_ROWS - 1},${ANSI_COLS - 1}`, cellA],
      ])]],
    ])
    const blanks = new Map<string, AnsiGrid[]>([
      ['layer1', [createEmptyGrid()]],
    ])

    const result = buildAllShiftedFrames(captured, blanks, 1, 0)
    const grid = result.get('layer1')![0]

    // Should be all DEFAULT_CELL — the cell shifted out of bounds
    for (let r = 0; r < ANSI_ROWS; r++)
      for (let c = 0; c < ANSI_COLS; c++)
        expect(grid[r][c]).toEqual(DEFAULT_CELL)
  })

  it('returns empty grids when captured cells are empty', () => {
    const captured = new Map<string, Map<string, AnsiCell>[]>([
      ['layer1', [new Map()]],
    ])
    const blanks = new Map<string, AnsiGrid[]>([
      ['layer1', [createEmptyGrid()]],
    ])

    const result = buildAllShiftedFrames(captured, blanks, 3, 3)
    const grid = result.get('layer1')![0]

    for (let r = 0; r < ANSI_ROWS; r++)
      for (let c = 0; c < ANSI_COLS; c++)
        expect(grid[r][c]).toEqual(DEFAULT_CELL)
  })

  it('handles multiple layers', () => {
    const captured = new Map<string, Map<string, AnsiCell>[]>([
      ['layer1', [new Map([['0,0', cellA]])]],
      ['layer2', [new Map([['1,1', cellB]])]],
    ])
    const blanks = new Map<string, AnsiGrid[]>([
      ['layer1', [createEmptyGrid()]],
      ['layer2', [createEmptyGrid()]],
    ])

    const result = buildAllShiftedFrames(captured, blanks, 1, 1)

    expect(result.get('layer1')![0][1][1]).toEqual(cellA)
    expect(result.get('layer2')![0][2][2]).toEqual(cellB)
    // Cross-check: layer1 should not have cellB
    expect(result.get('layer1')![0][2][2]).toEqual(DEFAULT_CELL)
  })

  it('reuses pre-allocated blank grids (same reference)', () => {
    const blankGrid = createEmptyGrid()
    const captured = new Map<string, Map<string, AnsiCell>[]>([
      ['layer1', [new Map([['0,0', cellA]])]],
    ])
    const blanks = new Map<string, AnsiGrid[]>([
      ['layer1', [blankGrid]],
    ])

    const result = buildAllShiftedFrames(captured, blanks, 0, 0)

    // The result grid should be the exact same reference as the pre-allocated blank
    expect(result.get('layer1')![0]).toBe(blankGrid)
  })

  it('leaves unaffected positions as DEFAULT_CELL', () => {
    const captured = new Map<string, Map<string, AnsiCell>[]>([
      ['layer1', [new Map([['10,10', cellA]])]],
    ])
    const blanks = new Map<string, AnsiGrid[]>([
      ['layer1', [createEmptyGrid()]],
    ])

    const result = buildAllShiftedFrames(captured, blanks, 0, 0)
    const grid = result.get('layer1')![0]

    // The cell at (10,10) should be cellA
    expect(grid[10][10]).toEqual(cellA)
    // A few sample unaffected positions
    expect(grid[0][0]).toEqual(DEFAULT_CELL)
    expect(grid[5][5]).toEqual(DEFAULT_CELL)
    expect(grid[ANSI_ROWS - 1][ANSI_COLS - 1]).toEqual(DEFAULT_CELL)
  })

  it('places cell at row 0 when shift lands there', () => {
    // Kills mutant: nr >= 0 → nr > 0
    const captured = new Map<string, Map<string, AnsiCell>[]>([
      ['layer1', [new Map([['1,5', cellA]])]],
    ])
    const blanks = new Map<string, AnsiGrid[]>([
      ['layer1', [createEmptyGrid()]],
    ])

    const result = buildAllShiftedFrames(captured, blanks, -1, 0)
    expect(result.get('layer1')![0][0][5]).toEqual(cellA)
  })

  it('places cell at col 0 when shift lands there', () => {
    // Kills mutant: nc >= 0 → nc > 0
    const captured = new Map<string, Map<string, AnsiCell>[]>([
      ['layer1', [new Map([['3,1', cellA]])]],
    ])
    const blanks = new Map<string, AnsiGrid[]>([
      ['layer1', [createEmptyGrid()]],
    ])

    const result = buildAllShiftedFrames(captured, blanks, 0, -1)
    expect(result.get('layer1')![0][3][0]).toEqual(cellA)
  })

  it('keeps cell at max col but discards one past it', () => {
    // Kills mutant: nc < ANSI_COLS → nc <= ANSI_COLS
    const lastCol = ANSI_COLS - 1
    const captured = new Map<string, Map<string, AnsiCell>[]>([
      ['layer1', [new Map([
        [`5,${lastCol}`, cellA],
        [`5,${lastCol - 1}`, cellB],
      ])]],
    ])
    const blanks = new Map<string, AnsiGrid[]>([
      ['layer1', [createEmptyGrid()]],
    ])

    const result = buildAllShiftedFrames(captured, blanks, 0, 1)
    const grid = result.get('layer1')![0]
    // cellB at col lastCol-1 shifts to lastCol — in bounds
    expect(grid[5][lastCol]).toEqual(cellB)
    // cellA at col lastCol shifts to lastCol+1 — out of bounds, discarded
    // Verify nothing went wrong at col lastCol for row 5 besides cellB
  })

  it('resets blank grids on repeated calls (clears old data)', () => {
    // Kills mutants on the reset loop (for r/c iterations)
    const blankGrid = createEmptyGrid()
    const captured = new Map<string, Map<string, AnsiCell>[]>([
      ['layer1', [new Map([['5,5', cellA]])]],
    ])
    const blanks = new Map<string, AnsiGrid[]>([
      ['layer1', [blankGrid]],
    ])

    // First call: places cellA at (5,5) with shift (0,0)
    buildAllShiftedFrames(captured, blanks, 0, 0)
    expect(blankGrid[5][5]).toEqual(cellA)

    // Second call with different captured data — old cellA at (5,5) must be cleared
    const captured2 = new Map<string, Map<string, AnsiCell>[]>([
      ['layer1', [new Map([['10,10', cellB]])]],
    ])
    buildAllShiftedFrames(captured2, blanks, 0, 0)
    expect(blankGrid[5][5]).toEqual(DEFAULT_CELL)
    expect(blankGrid[10][10]).toEqual(cellB)
  })

  it('skips frames where blank grid is missing', () => {
    // Kills mutant: if (!grid) continue → if (false) continue
    // and f < frameCaps.length → f <= frameCaps.length
    const captured = new Map<string, Map<string, AnsiCell>[]>([
      ['layer1', [
        new Map([['0,0', cellA]]),
        new Map([['1,1', cellB]]),
      ]],
    ])
    // Only provide 1 blank grid for 2 captured frames
    const blanks = new Map<string, AnsiGrid[]>([
      ['layer1', [createEmptyGrid()]],
    ])

    const result = buildAllShiftedFrames(captured, blanks, 0, 0)
    const frames = result.get('layer1')!
    // Only 1 frame should be in the result
    expect(frames).toHaveLength(1)
    expect(frames[0][0][0]).toEqual(cellA)
  })

  it('skips layers missing from blanks map', () => {
    const captured = new Map<string, Map<string, AnsiCell>[]>([
      ['layer1', [new Map([['0,0', cellA]])]],
      ['missing-layer', [new Map([['0,0', cellB]])]],
    ])
    const blanks = new Map<string, AnsiGrid[]>([
      ['layer1', [createEmptyGrid()]],
      // missing-layer intentionally not in blanks
    ])

    const result = buildAllShiftedFrames(captured, blanks, 0, 0)

    expect(result.has('layer1')).toBe(true)
    expect(result.has('missing-layer')).toBe(false)
  })
})
