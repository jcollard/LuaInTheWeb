import { describe, it, expect } from 'vitest'
import { flipCellsHorizontal, flipCellsVertical, cloneCell } from './gridUtils'
import type { AnsiCell } from './types'
import { HALF_BLOCK } from './types'

describe('flipCellsHorizontal', () => {
  const cellA: AnsiCell = { char: 'A', fg: [255, 0, 0], bg: [0, 0, 255] }
  const cellB: AnsiCell = { char: 'B', fg: [0, 255, 0], bg: [255, 255, 0] }
  const cellC: AnsiCell = { char: 'C', fg: [0, 0, 255], bg: [255, 0, 255] }

  it('flips a 2-wide selection (swaps columns)', () => {
    const cells = new Map<string, AnsiCell>([
      ['0,0', cloneCell(cellA)],
      ['0,1', cloneCell(cellB)],
    ])
    const result = flipCellsHorizontal(cells)
    expect(result.get('0,0')!.char).toBe('B')
    expect(result.get('0,1')!.char).toBe('A')
  })

  it('flips a 3-wide selection (middle stays, edges swap)', () => {
    const cells = new Map<string, AnsiCell>([
      ['0,2', cloneCell(cellA)],
      ['0,3', cloneCell(cellB)],
      ['0,4', cloneCell(cellC)],
    ])
    const result = flipCellsHorizontal(cells)
    expect(result.get('0,2')!.char).toBe('C')
    expect(result.get('0,3')!.char).toBe('B')
    expect(result.get('0,4')!.char).toBe('A')
  })

  it('single column is a no-op', () => {
    const cells = new Map<string, AnsiCell>([
      ['3,5', cloneCell(cellA)],
    ])
    const result = flipCellsHorizontal(cells)
    expect(result.get('3,5')!.char).toBe('A')
  })

  it('preserves row positions', () => {
    const cells = new Map<string, AnsiCell>([
      ['0,0', cloneCell(cellA)],
      ['1,0', cloneCell(cellB)],
      ['0,1', cloneCell(cellC)],
      ['1,1', cloneCell(cellA)],
    ])
    const result = flipCellsHorizontal(cells)
    expect(result.get('0,0')!.char).toBe('C')
    expect(result.get('0,1')!.char).toBe('A')
    expect(result.get('1,0')!.char).toBe('A')
    expect(result.get('1,1')!.char).toBe('B')
  })

  it('preserves cell content (char, fg, bg)', () => {
    const cells = new Map<string, AnsiCell>([
      ['0,0', cloneCell(cellA)],
      ['0,1', cloneCell(cellB)],
    ])
    const result = flipCellsHorizontal(cells)
    const moved = result.get('0,0')!
    expect(moved.char).toBe('B')
    expect(moved.fg).toEqual([0, 255, 0])
    expect(moved.bg).toEqual([255, 255, 0])
  })

  it('returns empty map for empty input', () => {
    const result = flipCellsHorizontal(new Map())
    expect(result.size).toBe(0)
  })

  it('preserves bounding box for non-zero-origin keys', () => {
    // Keys at cols 10-12, row 5
    const cells = new Map<string, AnsiCell>([
      ['5,10', cloneCell(cellA)],
      ['5,12', cloneCell(cellB)],
    ])
    const result = flipCellsHorizontal(cells)
    // A was at col 10, B at col 12 — flip swaps within col range 10-12
    expect(result.get('5,10')!.char).toBe('B')
    expect(result.get('5,12')!.char).toBe('A')
    // No keys outside the original col range
    expect(result.size).toBe(2)
    for (const key of result.keys()) {
      const col = Number(key.split(',')[1])
      expect(col).toBeGreaterThanOrEqual(10)
      expect(col).toBeLessThanOrEqual(12)
    }
  })

  it('handles sparse maps (gaps in grid)', () => {
    // 3-wide region but only corners populated
    const cells = new Map<string, AnsiCell>([
      ['0,0', cloneCell(cellA)],
      ['0,2', cloneCell(cellC)],
    ])
    const result = flipCellsHorizontal(cells)
    expect(result.get('0,0')!.char).toBe('C')
    expect(result.get('0,2')!.char).toBe('A')
    expect(result.size).toBe(2)
  })
})

describe('flipCellsVertical', () => {
  const cellA: AnsiCell = { char: 'A', fg: [255, 0, 0], bg: [0, 0, 255] }
  const cellB: AnsiCell = { char: 'B', fg: [0, 255, 0], bg: [255, 255, 0] }
  const cellC: AnsiCell = { char: 'C', fg: [0, 0, 255], bg: [255, 0, 255] }

  it('flips a 2-tall selection (swaps rows)', () => {
    const cells = new Map<string, AnsiCell>([
      ['0,0', cloneCell(cellA)],
      ['1,0', cloneCell(cellB)],
    ])
    const result = flipCellsVertical(cells)
    expect(result.get('0,0')!.char).toBe('B')
    expect(result.get('1,0')!.char).toBe('A')
  })

  it('flips a 3-tall selection (middle stays, edges swap)', () => {
    const cells = new Map<string, AnsiCell>([
      ['2,0', cloneCell(cellA)],
      ['3,0', cloneCell(cellB)],
      ['4,0', cloneCell(cellC)],
    ])
    const result = flipCellsVertical(cells)
    expect(result.get('2,0')!.char).toBe('C')
    expect(result.get('3,0')!.char).toBe('B')
    expect(result.get('4,0')!.char).toBe('A')
  })

  it('single row is a no-op', () => {
    const cells = new Map<string, AnsiCell>([
      ['3,5', cloneCell(cellA)],
    ])
    const result = flipCellsVertical(cells)
    expect(result.get('3,5')!.char).toBe('A')
  })

  it('preserves column positions', () => {
    const cells = new Map<string, AnsiCell>([
      ['0,0', cloneCell(cellA)],
      ['0,1', cloneCell(cellB)],
      ['1,0', cloneCell(cellC)],
      ['1,1', cloneCell(cellA)],
    ])
    const result = flipCellsVertical(cells)
    expect(result.get('0,0')!.char).toBe('C')
    expect(result.get('0,1')!.char).toBe('A')
    expect(result.get('1,0')!.char).toBe('A')
    expect(result.get('1,1')!.char).toBe('B')
  })

  it('preserves cell content (char, fg, bg)', () => {
    const cells = new Map<string, AnsiCell>([
      ['0,0', cloneCell(cellA)],
      ['1,0', cloneCell(cellB)],
    ])
    const result = flipCellsVertical(cells)
    const moved = result.get('0,0')!
    expect(moved.char).toBe('B')
    expect(moved.fg).toEqual([0, 255, 0])
    expect(moved.bg).toEqual([255, 255, 0])
  })

  it('returns empty map for empty input', () => {
    const result = flipCellsVertical(new Map())
    expect(result.size).toBe(0)
  })

  it('preserves bounding box for non-zero-origin keys', () => {
    // Keys at rows 10-12, col 5
    const cells = new Map<string, AnsiCell>([
      ['10,5', cloneCell(cellA)],
      ['12,5', cloneCell(cellB)],
    ])
    const result = flipCellsVertical(cells)
    // A was at row 10, B at row 12 — flip swaps within row range 10-12
    expect(result.get('10,5')!.char).toBe('B')
    expect(result.get('12,5')!.char).toBe('A')
    // No keys outside the original row range
    expect(result.size).toBe(2)
    for (const key of result.keys()) {
      const row = Number(key.split(',')[0])
      expect(row).toBeGreaterThanOrEqual(10)
      expect(row).toBeLessThanOrEqual(12)
    }
  })

  it('handles sparse maps (gaps in grid)', () => {
    // 3-tall region but only top and bottom populated
    const cells = new Map<string, AnsiCell>([
      ['0,0', cloneCell(cellA)],
      ['2,0', cloneCell(cellC)],
    ])
    const result = flipCellsVertical(cells)
    expect(result.get('0,0')!.char).toBe('C')
    expect(result.get('2,0')!.char).toBe('A')
    expect(result.size).toBe(2)
  })

  it('swaps fg/bg for HALF_BLOCK cells (top/bottom half-pixels)', () => {
    const topRed: AnsiCell = { char: HALF_BLOCK, fg: [255, 0, 0], bg: [0, 0, 255] }
    const topGreen: AnsiCell = { char: HALF_BLOCK, fg: [0, 255, 0], bg: [255, 255, 0] }
    const cells = new Map<string, AnsiCell>([
      ['0,0', cloneCell(topRed)],
      ['1,0', cloneCell(topGreen)],
    ])
    const result = flipCellsVertical(cells)
    // Row positions swap AND fg/bg swap within each HALF_BLOCK cell
    const movedGreen = result.get('0,0')!
    expect(movedGreen.char).toBe(HALF_BLOCK)
    expect(movedGreen.fg).toEqual([255, 255, 0])  // was bg
    expect(movedGreen.bg).toEqual([0, 255, 0])    // was fg

    const movedRed = result.get('1,0')!
    expect(movedRed.char).toBe(HALF_BLOCK)
    expect(movedRed.fg).toEqual([0, 0, 255])      // was bg
    expect(movedRed.bg).toEqual([255, 0, 0])       // was fg
  })

  it('does not swap fg/bg for non-HALF_BLOCK cells', () => {
    const cells = new Map<string, AnsiCell>([
      ['0,0', cloneCell(cellA)],
      ['1,0', cloneCell(cellB)],
    ])
    const result = flipCellsVertical(cells)
    // Row positions swap but fg/bg stay as-is for regular chars
    const moved = result.get('0,0')!
    expect(moved.char).toBe('B')
    expect(moved.fg).toEqual([0, 255, 0])
    expect(moved.bg).toEqual([255, 255, 0])
  })
})
