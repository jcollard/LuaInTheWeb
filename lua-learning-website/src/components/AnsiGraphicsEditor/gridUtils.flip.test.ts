import { describe, it, expect } from 'vitest'
import { flipCellsHorizontal } from './gridUtils'
import type { AnsiCell, RGBColor } from './types'

describe('flipCellsHorizontal', () => {
  const cellA: AnsiCell = { char: 'A', fg: [255, 0, 0], bg: [0, 0, 255] }
  const cellB: AnsiCell = { char: 'B', fg: [0, 255, 0], bg: [255, 255, 0] }
  const cellC: AnsiCell = { char: 'C', fg: [0, 0, 255], bg: [255, 0, 255] }

  it('flips a 2-wide selection (swaps columns)', () => {
    const cells = new Map<string, AnsiCell>([
      ['0,0', { ...cellA, fg: [...cellA.fg] as RGBColor, bg: [...cellA.bg] as RGBColor }],
      ['0,1', { ...cellB, fg: [...cellB.fg] as RGBColor, bg: [...cellB.bg] as RGBColor }],
    ])
    const result = flipCellsHorizontal(cells)
    expect(result.get('0,0')!.char).toBe('B')
    expect(result.get('0,1')!.char).toBe('A')
  })

  it('flips a 3-wide selection (middle stays, edges swap)', () => {
    const cells = new Map<string, AnsiCell>([
      ['0,2', { ...cellA, fg: [...cellA.fg] as RGBColor, bg: [...cellA.bg] as RGBColor }],
      ['0,3', { ...cellB, fg: [...cellB.fg] as RGBColor, bg: [...cellB.bg] as RGBColor }],
      ['0,4', { ...cellC, fg: [...cellC.fg] as RGBColor, bg: [...cellC.bg] as RGBColor }],
    ])
    const result = flipCellsHorizontal(cells)
    expect(result.get('0,2')!.char).toBe('C')
    expect(result.get('0,3')!.char).toBe('B')
    expect(result.get('0,4')!.char).toBe('A')
  })

  it('single column is a no-op', () => {
    const cells = new Map<string, AnsiCell>([
      ['3,5', { ...cellA, fg: [...cellA.fg] as RGBColor, bg: [...cellA.bg] as RGBColor }],
    ])
    const result = flipCellsHorizontal(cells)
    expect(result.get('3,5')!.char).toBe('A')
  })

  it('preserves row positions', () => {
    const cells = new Map<string, AnsiCell>([
      ['0,0', { ...cellA, fg: [...cellA.fg] as RGBColor, bg: [...cellA.bg] as RGBColor }],
      ['1,0', { ...cellB, fg: [...cellB.fg] as RGBColor, bg: [...cellB.bg] as RGBColor }],
      ['0,1', { ...cellC, fg: [...cellC.fg] as RGBColor, bg: [...cellC.bg] as RGBColor }],
      ['1,1', { ...cellA, fg: [...cellA.fg] as RGBColor, bg: [...cellA.bg] as RGBColor }],
    ])
    const result = flipCellsHorizontal(cells)
    expect(result.get('0,0')!.char).toBe('C')
    expect(result.get('0,1')!.char).toBe('A')
    expect(result.get('1,0')!.char).toBe('A')
    expect(result.get('1,1')!.char).toBe('B')
  })

  it('preserves cell content (char, fg, bg)', () => {
    const cells = new Map<string, AnsiCell>([
      ['0,0', { ...cellA, fg: [...cellA.fg] as RGBColor, bg: [...cellA.bg] as RGBColor }],
      ['0,1', { ...cellB, fg: [...cellB.fg] as RGBColor, bg: [...cellB.bg] as RGBColor }],
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
})
