import { describe, it, expect } from 'vitest'
import { extractRegionCells, computeSelectionMoveCells, toRelativeKeys, toAbsoluteKeys } from './gridUtils'
import type { AnsiCell, AnsiGrid, RGBColor } from './types'
import { DEFAULT_FG, DEFAULT_BG } from './types'

const red: RGBColor = [255, 0, 0]
const blue: RGBColor = [0, 0, 255]

function makeSmallGrid(rows: number, cols: number, cell?: AnsiCell): AnsiGrid {
  const c = cell ?? { char: ' ', fg: [...DEFAULT_FG] as RGBColor, bg: [...DEFAULT_BG] as RGBColor }
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ ...c, fg: [...c.fg] as RGBColor, bg: [...c.bg] as RGBColor }))
  )
}

describe('extractRegionCells', () => {
  it('should extract cells from a 2x2 region', () => {
    const grid = makeSmallGrid(3, 3, { char: ' ', fg: [...DEFAULT_FG] as RGBColor, bg: [...DEFAULT_BG] as RGBColor })
    grid[0][0] = { char: 'A', fg: [...red] as RGBColor, bg: [...blue] as RGBColor }
    grid[0][1] = { char: 'B', fg: [...red] as RGBColor, bg: [...blue] as RGBColor }
    grid[1][0] = { char: 'C', fg: [...red] as RGBColor, bg: [...blue] as RGBColor }
    grid[1][1] = { char: 'D', fg: [...red] as RGBColor, bg: [...blue] as RGBColor }

    const cells = extractRegionCells(grid, 0, 0, 1, 1)
    expect(cells.size).toBe(4)
    expect(cells.get('0,0')!.char).toBe('A')
    expect(cells.get('0,1')!.char).toBe('B')
    expect(cells.get('1,0')!.char).toBe('C')
    expect(cells.get('1,1')!.char).toBe('D')
  })

  it('should return cloned cells (modifying returned cells does not affect grid)', () => {
    const grid = makeSmallGrid(2, 2, { char: 'X', fg: [...red] as RGBColor, bg: [...blue] as RGBColor })
    const cells = extractRegionCells(grid, 0, 0, 0, 0)
    const cell = cells.get('0,0')!
    cell.char = 'Z'
    cell.fg[0] = 0
    expect(grid[0][0].char).toBe('X')
    expect(grid[0][0].fg[0]).toBe(255)
  })

  it('should clip to bounds (ignores out-of-bounds coordinates)', () => {
    const grid = makeSmallGrid(2, 2, { char: 'X', fg: [...red] as RGBColor, bg: [...blue] as RGBColor })
    const cells = extractRegionCells(grid, -1, -1, 5, 5)
    expect(cells.size).toBe(4)
    expect(cells.has('0,0')).toBe(true)
    expect(cells.has('0,1')).toBe(true)
    expect(cells.has('1,0')).toBe(true)
    expect(cells.has('1,1')).toBe(true)
  })

  it('should return empty map for zero-size region where r0 > r1', () => {
    const grid = makeSmallGrid(3, 3)
    const cells = extractRegionCells(grid, 2, 0, 1, 0)
    expect(cells.size).toBe(0)
  })
})

describe('computeSelectionMoveCells', () => {
  it('should move right by 1: source cells cleared, destination cells set', () => {
    const captured = new Map<string, AnsiCell>()
    captured.set('0,0', { char: 'A', fg: [...red] as RGBColor, bg: [...blue] as RGBColor })
    captured.set('0,1', { char: 'B', fg: [...red] as RGBColor, bg: [...blue] as RGBColor })

    const result = computeSelectionMoveCells(captured, 0, 0, 0, 1, 3, 3)
    expect(result.get('0,0')!.char).toBe(' ')
    expect(result.get('0,1')!.char).toBe('A')
    expect(result.get('0,2')!.char).toBe('B')
  })

  it('should handle no-op move (dr=0, dc=0): only destination cells, no clearing', () => {
    const captured = new Map<string, AnsiCell>()
    captured.set('1,1', { char: 'X', fg: [...red] as RGBColor, bg: [...blue] as RGBColor })

    const result = computeSelectionMoveCells(captured, 1, 1, 1, 1, 3, 3)
    expect(result.size).toBe(1)
    expect(result.get('1,1')!.char).toBe('X')
  })

  it('should drop destination cells that fall out of bounds', () => {
    const captured = new Map<string, AnsiCell>()
    captured.set('0,0', { char: 'A', fg: [...red] as RGBColor, bg: [...blue] as RGBColor })
    captured.set('0,1', { char: 'B', fg: [...red] as RGBColor, bg: [...blue] as RGBColor })

    const result = computeSelectionMoveCells(captured, 0, 0, 0, 2, 3, 3)
    expect(result.has('0,2')).toBe(true)
    expect(result.has('0,3')).toBe(false)
    expect(result.get('0,0')!.char).toBe(' ')
    expect(result.get('0,1')!.char).toBe(' ')
  })

  it('should clear all source cells when moved fully out of bounds', () => {
    const captured = new Map<string, AnsiCell>()
    captured.set('0,0', { char: 'A', fg: [...red] as RGBColor, bg: [...blue] as RGBColor })

    const result = computeSelectionMoveCells(captured, 0, 0, 0, 10, 3, 3)
    expect(result.size).toBe(1)
    expect(result.get('0,0')!.char).toBe(' ')
  })
})

describe('toRelativeKeys', () => {
  it('should convert absolute keys to relative keys based on origin', () => {
    const cells = new Map<string, AnsiCell>()
    cells.set('5,10', { char: 'A', fg: [...red] as RGBColor, bg: [...blue] as RGBColor })
    cells.set('6,11', { char: 'B', fg: [...red] as RGBColor, bg: [...blue] as RGBColor })

    const result = toRelativeKeys(cells, 5, 10)
    expect(result.size).toBe(2)
    expect(result.get('0,0')!.char).toBe('A')
    expect(result.get('1,1')!.char).toBe('B')
  })

  it('should deep-clone cells (modifying result does not affect input)', () => {
    const cells = new Map<string, AnsiCell>()
    cells.set('2,3', { char: 'X', fg: [...red] as RGBColor, bg: [...blue] as RGBColor })

    const result = toRelativeKeys(cells, 2, 3)
    result.get('0,0')!.fg[0] = 0
    expect(cells.get('2,3')!.fg[0]).toBe(255)
  })
})

describe('toAbsoluteKeys', () => {
  it('should convert relative keys to absolute keys at target origin', () => {
    const cells = new Map<string, AnsiCell>()
    cells.set('0,0', { char: 'A', fg: [...red] as RGBColor, bg: [...blue] as RGBColor })
    cells.set('1,1', { char: 'B', fg: [...red] as RGBColor, bg: [...blue] as RGBColor })

    const result = toAbsoluteKeys(cells, 3, 7)
    expect(result.size).toBe(2)
    expect(result.get('3,7')!.char).toBe('A')
    expect(result.get('4,8')!.char).toBe('B')
  })

  it('should deep-clone cells (modifying result does not affect input)', () => {
    const cells = new Map<string, AnsiCell>()
    cells.set('0,0', { char: 'X', fg: [...red] as RGBColor, bg: [...blue] as RGBColor })

    const result = toAbsoluteKeys(cells, 1, 1)
    result.get('1,1')!.fg[0] = 0
    expect(cells.get('0,0')!.fg[0]).toBe(255)
  })

  it('should roundtrip correctly with toRelativeKeys', () => {
    const cells = new Map<string, AnsiCell>()
    cells.set('5,10', { char: 'A', fg: [...red] as RGBColor, bg: [...blue] as RGBColor })
    cells.set('6,12', { char: 'B', fg: [...blue] as RGBColor, bg: [...red] as RGBColor })

    const relative = toRelativeKeys(cells, 5, 10)
    const absolute = toAbsoluteKeys(relative, 5, 10)

    expect(absolute.size).toBe(2)
    expect(absolute.get('5,10')!.char).toBe('A')
    expect(absolute.get('6,12')!.char).toBe('B')
    expect(absolute.get('5,10')!.fg).toEqual(red)
    expect(absolute.get('6,12')!.fg).toEqual(blue)
  })
})
