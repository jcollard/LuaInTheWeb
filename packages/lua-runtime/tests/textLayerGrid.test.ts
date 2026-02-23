import { describe, it, expect } from 'vitest'
import { wrapText, justifyLine, buildRawIndexMap, renderTextLayerGrid } from '../src/textLayerGrid'
import type { RGBColor, Rect } from '../src/screenTypes'
import { TRANSPARENT_BG, DEFAULT_CELL, ANSI_ROWS, ANSI_COLS } from '../src/screenTypes'

describe('wrapText', () => {
  it('returns empty array for empty string', () => {
    expect(wrapText('', 10)).toEqual([])
  })

  it('does not wrap short text', () => {
    expect(wrapText('hello', 10)).toEqual(['hello'])
  })

  it('wraps at word boundary', () => {
    expect(wrapText('hello world', 6)).toEqual(['hello', 'world'])
  })

  it('breaks long words by character', () => {
    expect(wrapText('abcdefgh', 4)).toEqual(['abcd', 'efgh'])
  })

  it('handles explicit newlines', () => {
    expect(wrapText('line1\nline2', 20)).toEqual(['line1', 'line2'])
  })

  it('handles empty paragraphs from double newlines', () => {
    expect(wrapText('a\n\nb', 10)).toEqual(['a', '', 'b'])
  })

  it('wraps multiple words correctly', () => {
    expect(wrapText('one two three four', 9)).toEqual(['one two', 'three', 'four'])
  })
})

describe('justifyLine', () => {
  it('returns single-word lines unchanged', () => {
    expect(justifyLine('hello', 10)).toBe('hello')
  })

  it('distributes spaces evenly between words', () => {
    expect(justifyLine('a b', 5)).toBe('a   b')
  })

  it('distributes remainder spaces to earlier gaps', () => {
    // "a b c" is 5 chars (3 letters + 2 spaces), target width = 9
    // totalSpaces = 9 - 3 = 6, gaps = 2, baseGap = 3, remainder = 0
    expect(justifyLine('a b c', 9)).toBe('a   b   c')
  })

  it('handles uneven distribution', () => {
    // "a b c" -> target width = 8
    // totalSpaces = 8 - 3 = 5, gaps = 2, baseGap = 2, remainder = 1
    expect(justifyLine('a b c', 8)).toBe('a   b  c')
  })
})

describe('buildRawIndexMap', () => {
  it('returns empty array for empty string', () => {
    expect(buildRawIndexMap('', 10)).toEqual([])
  })

  it('maps simple single-line text', () => {
    expect(buildRawIndexMap('abc', 10)).toEqual([[0, 1, 2]])
  })

  it('maps wrapped text correctly', () => {
    const result = buildRawIndexMap('ab cd', 3)
    expect(result).toEqual([[0, 1], [3, 4]])
  })

  it('handles newlines', () => {
    const result = buildRawIndexMap('ab\ncd', 10)
    expect(result).toEqual([[0, 1], [3, 4]])
  })
})

describe('renderTextLayerGrid', () => {
  const textFg: RGBColor = [255, 255, 255]
  const bounds: Rect = { r0: 0, c0: 0, r1: 2, c1: 9 }

  it('returns default grid for empty text', () => {
    const grid = renderTextLayerGrid('', bounds, textFg)
    expect(grid[0][0]).toEqual(DEFAULT_CELL)
  })

  it('places text characters with TRANSPARENT_BG', () => {
    const grid = renderTextLayerGrid('Hi', bounds, textFg)
    expect(grid[0][0].char).toBe('H')
    expect(grid[0][0].fg).toEqual(textFg)
    expect(grid[0][0].bg).toEqual(TRANSPARENT_BG)
    expect(grid[0][1].char).toBe('i')
  })

  it('does not modify cells outside bounds', () => {
    const smallBounds: Rect = { r0: 1, c0: 5, r1: 1, c1: 7 }
    const grid = renderTextLayerGrid('AB', smallBounds, textFg)
    expect(grid[0][0]).toEqual(DEFAULT_CELL)
    expect(grid[1][5].char).toBe('A')
    expect(grid[1][6].char).toBe('B')
    expect(grid[1][4]).toEqual(DEFAULT_CELL)
  })

  it('wraps text within bounds width', () => {
    const narrowBounds: Rect = { r0: 0, c0: 0, r1: 5, c1: 4 }
    const grid = renderTextLayerGrid('hello world', narrowBounds, textFg)
    // width = 5, "hello" fits on line 0, "world" on line 1
    expect(grid[0][0].char).toBe('h')
    expect(grid[0][4].char).toBe('o')
    expect(grid[1][0].char).toBe('w')
  })

  it('uses per-character colors when textFgColors provided', () => {
    const colors: RGBColor[] = [[255, 0, 0], [0, 255, 0]]
    const grid = renderTextLayerGrid('AB', bounds, textFg, colors)
    expect(grid[0][0].fg).toEqual([255, 0, 0])
    expect(grid[0][1].fg).toEqual([0, 255, 0])
  })

  it('centers text with center alignment', () => {
    const centerBounds: Rect = { r0: 0, c0: 0, r1: 0, c1: 9 }
    const grid = renderTextLayerGrid('Hi', centerBounds, textFg, undefined, 'center')
    // width = 10, "Hi" length = 2, offset = floor((10-2)/2) = 4
    expect(grid[0][4].char).toBe('H')
    expect(grid[0][5].char).toBe('i')
    expect(grid[0][3]).toEqual(DEFAULT_CELL)
  })

  it('right-aligns text with right alignment', () => {
    const rightBounds: Rect = { r0: 0, c0: 0, r1: 0, c1: 9 }
    const grid = renderTextLayerGrid('Hi', rightBounds, textFg, undefined, 'right')
    // width = 10, "Hi" length = 2, offset = 10-2 = 8
    expect(grid[0][8].char).toBe('H')
    expect(grid[0][9].char).toBe('i')
  })

  it('truncates text beyond maxRows', () => {
    const tinyBounds: Rect = { r0: 0, c0: 0, r1: 0, c1: 4 }
    const grid = renderTextLayerGrid('hello world extra', tinyBounds, textFg)
    // Only 1 row allowed, so only first line of wrapped text appears
    expect(grid[0][0].char).toBe('h')
    expect(grid[1][0]).toEqual(DEFAULT_CELL)
  })

  it('returns full 80x25 grid', () => {
    const grid = renderTextLayerGrid('test', bounds, textFg)
    expect(grid.length).toBe(ANSI_ROWS)
    expect(grid[0].length).toBe(ANSI_COLS)
  })
})
