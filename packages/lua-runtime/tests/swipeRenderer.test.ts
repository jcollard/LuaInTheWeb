import { describe, it, expect } from 'vitest'
import {
  formatCell,
  buildSwipeGrid,
  buildDitherGrid,
  generateDitherOrder,
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
    expect(result).toContain('\x1b[0m')
    expect(result.endsWith('\x1b[0m')).toBe(true)
  })
})

describe('buildSwipeGrid', () => {
  it('at boundaryCol=0 output matches source entirely', () => {
    const target = createFillGrid(' ', [0, 0, 0])
    const source = makeGradientGrid()
    const output = createEmptyGrid()

    buildSwipeGrid(target, source, 0, 'right', output)

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

    buildSwipeGrid(target, source, 1, 'right', output)

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

    buildSwipeGrid(target, source, 0.5, 'right', output)

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

    buildSwipeGrid(target, source, 0.3125, 'right', output)

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

describe('generateDitherOrder', () => {
  it('returns exactly ROWS*COLS elements', () => {
    const order = generateDitherOrder(42)
    expect(order).toHaveLength(ANSI_ROWS * ANSI_COLS)
  })

  it('is a valid permutation (no duplicates, all indices present)', () => {
    const order = generateDitherOrder(42)
    const total = ANSI_ROWS * ANSI_COLS
    const seen = new Set(order)
    expect(seen.size).toBe(total)
    for (let i = 0; i < total; i++) {
      expect(seen.has(i)).toBe(true)
    }
  })

  it('different seeds produce different orders', () => {
    const a = generateDitherOrder(1)
    const b = generateDitherOrder(2)
    // At least some elements should differ
    const diffs = a.filter((v, i) => v !== b[i]).length
    expect(diffs).toBeGreaterThan(0)
  })
})

describe('buildDitherGrid', () => {
  const total = ANSI_ROWS * ANSI_COLS

  function countTargetCells(output: AnsiGrid, target: AnsiGrid): number {
    let count = 0
    for (let r = 0; r < ANSI_ROWS; r++) {
      for (let c = 0; c < ANSI_COLS; c++) {
        const o = output[r][c], t = target[r][c]
        if (o.char === t.char
          && o.fg[0] === t.fg[0] && o.fg[1] === t.fg[1] && o.fg[2] === t.fg[2]
          && o.bg[0] === t.bg[0] && o.bg[1] === t.bg[1] && o.bg[2] === t.bg[2]) {
          count++
        }
      }
    }
    return count
  }

  it('at progress=0, all cells match source', () => {
    const target = createFillGrid('T', [255, 0, 0])
    const source = makeGradientGrid()
    const output = createEmptyGrid()
    const order = generateDitherOrder(42)

    buildDitherGrid(target, source, 0, order, output)

    expect(countTargetCells(output, source)).toBe(total)
  })

  it('at progress=1, all cells match target', () => {
    const target = createFillGrid('T', [255, 0, 0])
    const source = makeGradientGrid()
    const output = createEmptyGrid()
    const order = generateDitherOrder(42)

    buildDitherGrid(target, source, 1, order, output)

    expect(countTargetCells(output, target)).toBe(total)
  })

  it('at progress=0.5, approximately half cells are target', () => {
    const target = createFillGrid('T', [255, 0, 0])
    const source = makeGradientGrid()
    const output = createEmptyGrid()
    const order = generateDitherOrder(42)

    buildDitherGrid(target, source, 0.5, order, output)

    const targetCount = countTargetCells(output, target)
    expect(targetCount).toBe(Math.floor(total * 0.5))
  })

  it('at progress=0.999, count is floor(total*0.999)', () => {
    const target = createFillGrid('T', [255, 0, 0])
    const source = makeGradientGrid()
    const output = createEmptyGrid()
    const order = generateDitherOrder(42)

    buildDitherGrid(target, source, 0.999, order, output)

    const targetCount = countTargetCells(output, target)
    expect(targetCount).toBe(Math.floor(total * 0.999))
  })

  it('monotonically increases target cell count as progress increases', () => {
    const target = createFillGrid('T', [255, 0, 0])
    const source = makeGradientGrid()
    const output = createEmptyGrid()
    const order = generateDitherOrder(42)

    let prevCount = 0
    for (let p = 0; p <= 1; p += 0.05) {
      buildDitherGrid(target, source, p, order, output)
      const count = countTargetCells(output, target)
      expect(count).toBeGreaterThanOrEqual(prevCount)
      prevCount = count
    }
  })
})
