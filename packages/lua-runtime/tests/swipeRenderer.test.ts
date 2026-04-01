import { describe, it, expect } from 'vitest'
import {
  formatCell,
  buildSwipeGrid,
  renderSwipeDiff,
  updateShadow,
  createSentinelGrid,
} from '../src/swipeRenderer'
import { createEmptyGrid, createFillGrid, ANSI_ROWS, ANSI_COLS } from '../src/screenTypes'
import type { AnsiGrid, RGBColor } from '../src/screenTypes'

/** Create a grid with unique colors per cell for testing. */
function makeGradientGrid(): AnsiGrid {
  return Array.from({ length: ANSI_ROWS }, (_, r) =>
    Array.from({ length: ANSI_COLS }, (_, c) => ({
      char: 'G', fg: [r * 10, c * 3, 100] as RGBColor, bg: [r * 5, c * 2, 50] as RGBColor,
    }))
  )
}

describe('formatCell', () => {
  it('matches the terminalBuffer.ts format exactly', () => {
    const result = formatCell(0, 0, [255, 128, 0], [0, 0, 0], 'X')
    expect(result).toBe('\x1b[1;1H\x1b[38;2;255;128;0m\x1b[48;2;0;0;0mX\x1b[0m')
  })

  it('uses 1-based row/col positioning', () => {
    const result = formatCell(24, 79, [0, 0, 0], [0, 0, 0], ' ')
    expect(result).toContain('\x1b[25;80H')
  })

  it('ends with reset code', () => {
    const result = formatCell(0, 0, [0, 0, 0], [0, 0, 0], ' ')
    expect(result).toMatch(/\x1b\[0m$/)
  })
})

describe('buildSwipeGrid', () => {
  it('at boundaryCol=0 output matches source entirely', () => {
    const target = createFillGrid(' ', [0, 0, 0])
    const source = makeGradientGrid()
    const output = createEmptyGrid()

    buildSwipeGrid(target, source, 0, output)

    for (let r = 0; r < ANSI_ROWS; r++) {
      for (let c = 0; c < ANSI_COLS; c++) {
        expect(output[r][c].bg).toEqual(source[r][c].bg)
      }
    }
  })

  it('at boundaryCol=80 output matches target entirely', () => {
    const target = createFillGrid(' ', [0, 0, 0])
    const source = makeGradientGrid()
    const output = createEmptyGrid()

    buildSwipeGrid(target, source, 80, output)

    for (let r = 0; r < ANSI_ROWS; r++) {
      for (let c = 0; c < ANSI_COLS; c++) {
        expect(output[r][c].bg).toEqual([0, 0, 0])
      }
    }
  })

  it('at boundaryCol=40 left half is target, right half is source', () => {
    const target = createFillGrid('X', [255, 0, 0])
    const source = makeGradientGrid()
    const output = createEmptyGrid()

    buildSwipeGrid(target, source, 40, output)

    for (let r = 0; r < ANSI_ROWS; r++) {
      for (let c = 0; c < 40; c++) {
        expect(output[r][c].char).toBe('X')
        expect(output[r][c].bg).toEqual([255, 0, 0])
      }
      for (let c = 40; c < ANSI_COLS; c++) {
        expect(output[r][c].char).toBe('G')
        expect(output[r][c].bg).toEqual(source[r][c].bg)
      }
    }
  })

  it('boundary is consistent across all rows (vertical line)', () => {
    const target = createFillGrid(' ', [0, 0, 0])
    const source = makeGradientGrid()
    const output = createEmptyGrid()

    buildSwipeGrid(target, source, 25, output)

    for (let r = 0; r < ANSI_ROWS; r++) {
      // Col 24 should be target, col 25 should be source
      expect(output[r][24].bg).toEqual([0, 0, 0])
      expect(output[r][25].bg).toEqual(source[r][25].bg)
    }
  })
})

describe('renderSwipeDiff', () => {
  it('returns null when desired matches shadow', () => {
    const grid = makeGradientGrid()
    // Shadow is a copy of the same grid
    const shadow = makeGradientGrid()
    expect(renderSwipeDiff(grid, shadow)).toBeNull()
  })

  it('returns batch string for changed cells', () => {
    const desired = makeGradientGrid()
    const shadow = createSentinelGrid() // all sentinels, nothing matches

    const batch = renderSwipeDiff(desired, shadow)
    expect(batch).not.toBeNull()
    expect(batch!.length).toBeGreaterThan(0)
  })

  it('batch contains formatCell output with reset codes', () => {
    const desired = createFillGrid('A', [100, 200, 50])
    const shadow = createFillGrid('B', [0, 0, 0])

    const batch = renderSwipeDiff(desired, shadow)!

    // Should contain the cell format with \x1b[0m reset
    expect(batch).toContain('\x1b[38;2;100;200;50m')
    expect(batch).toContain('\x1b[48;2;100;200;50m')
    expect(batch).toContain('A')
    expect(batch).toContain('\x1b[0m')
  })

  it('only includes changed cells', () => {
    const desired = makeGradientGrid()
    const shadow = makeGradientGrid()
    // Change just one cell
    desired[0][0].char = 'Z'

    const batch = renderSwipeDiff(desired, shadow)!

    // Should position at row 1, col 1
    expect(batch).toContain('\x1b[1;1H')
    // Should NOT contain positions for unchanged cells
    expect(batch).not.toContain('\x1b[1;2H')
    expect(batch).not.toContain('\x1b[2;1H')
  })
})

describe('updateShadow', () => {
  it('copies changed cells from desired to shadow', () => {
    const desired = makeGradientGrid()
    const shadow = createSentinelGrid()

    updateShadow(desired, shadow)

    for (let r = 0; r < ANSI_ROWS; r++) {
      for (let c = 0; c < ANSI_COLS; c++) {
        expect(shadow[r][c].char).toBe(desired[r][c].char)
        expect(shadow[r][c].fg).toEqual(desired[r][c].fg)
        expect(shadow[r][c].bg).toEqual(desired[r][c].bg)
      }
    }
  })

  it('shadow cells are copies, not references', () => {
    const desired = makeGradientGrid()
    const shadow = createSentinelGrid()

    updateShadow(desired, shadow)

    // Mutate desired — shadow should not change
    desired[0][0].fg[0] = 999
    expect(shadow[0][0].fg[0]).not.toBe(999)
  })
})
