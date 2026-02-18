import { describe, it, expect } from 'vitest'
import { wrapText, renderTextLayerGrid, cursorPosToVisual, justifyLine } from './textLayerGrid'
import { ANSI_ROWS, ANSI_COLS, TRANSPARENT_BG } from './types'
import type { RGBColor, Rect } from './types'
import { isDefaultCell } from './layerUtils'

describe('wrapText', () => {
  it('returns empty array for empty string', () => {
    expect(wrapText('', 10)).toEqual([])
  })

  it('returns single line when text fits in width', () => {
    expect(wrapText('hello', 10)).toEqual(['hello'])
  })

  it('wraps at word boundary when text exceeds width', () => {
    expect(wrapText('hello world', 7)).toEqual(['hello', 'world'])
  })

  it('wraps long word by character break', () => {
    expect(wrapText('abcdefghij', 5)).toEqual(['abcde', 'fghij'])
  })

  it('handles newline characters as forced breaks', () => {
    expect(wrapText('line1\nline2', 20)).toEqual(['line1', 'line2'])
  })

  it('handles multiple spaces as a single separator', () => {
    expect(wrapText('a  b', 10)).toEqual(['a  b'])
  })

  it('wraps multiple words across lines', () => {
    expect(wrapText('one two three four', 9)).toEqual(['one two', 'three', 'four'])
  })

  it('handles width of 1', () => {
    expect(wrapText('ab', 1)).toEqual(['a', 'b'])
  })

  it('handles newline at end', () => {
    expect(wrapText('hello\n', 20)).toEqual(['hello', ''])
  })

  it('handles consecutive newlines', () => {
    expect(wrapText('a\n\nb', 10)).toEqual(['a', '', 'b'])
  })
})

describe('cursorPosToVisual', () => {
  it('returns (0, 0) for empty text at position 0', () => {
    expect(cursorPosToVisual('', 10, 0)).toEqual({ row: 0, col: 0 })
  })

  it('returns correct col for cursor within first line', () => {
    expect(cursorPosToVisual('hello', 10, 3)).toEqual({ row: 0, col: 3 })
  })

  it('returns correct position at end of text', () => {
    expect(cursorPosToVisual('hello', 10, 5)).toEqual({ row: 0, col: 5 })
  })

  it('handles explicit newline: cursor after newline goes to next row', () => {
    expect(cursorPosToVisual('ab\ncd', 10, 3)).toEqual({ row: 1, col: 0 })
    expect(cursorPosToVisual('ab\ncd', 10, 4)).toEqual({ row: 1, col: 1 })
  })

  it('handles word wrap: cursor wraps to next visual row', () => {
    // "hello world" with width 7 wraps to ["hello", "world"]
    // Cursor at position 6 (the 'w') should be row 1, col 0
    expect(cursorPosToVisual('hello world', 7, 6)).toEqual({ row: 1, col: 0 })
  })

  it('handles cursor at end of wrapped text', () => {
    // "hello world" with width 7 → ["hello", "world"]
    // Cursor at position 11 (end) → row 1, col 5
    expect(cursorPosToVisual('hello world', 7, 11)).toEqual({ row: 1, col: 5 })
  })

  it('handles character-break wrapping', () => {
    // "abcdefghij" with width 5 → ["abcde", "fghij"]
    // Cursor at position 5 (the 'f') → row 1, col 0
    expect(cursorPosToVisual('abcdefghij', 5, 5)).toEqual({ row: 1, col: 0 })
  })

  it('handles mixed newlines and word wrap', () => {
    // "abc\nhello world" with width 7
    // Lines: ["abc", "hello", "world"]
    // Cursor at pos 4 ('h') → row 1, col 0
    // Cursor at pos 10 ('w') → row 2, col 0
    expect(cursorPosToVisual('abc\nhello world', 7, 4)).toEqual({ row: 1, col: 0 })
    expect(cursorPosToVisual('abc\nhello world', 7, 10)).toEqual({ row: 2, col: 0 })
  })
})

describe('cursorPosToVisual with textAlign', () => {
  it('center alignment offsets col', () => {
    // "Hi" in width 10, offset = floor((10-2)/2) = 4
    const result = cursorPosToVisual('Hi', 10, 0, 'center')
    expect(result).toEqual({ row: 0, col: 4 })
  })

  it('center alignment at end of text', () => {
    const result = cursorPosToVisual('Hi', 10, 2, 'center')
    expect(result).toEqual({ row: 0, col: 6 })
  })

  it('right alignment offsets col', () => {
    // "Hi" in width 10, offset = 10-2 = 8
    const result = cursorPosToVisual('Hi', 10, 0, 'right')
    expect(result).toEqual({ row: 0, col: 8 })
  })

  it('right alignment at end of text', () => {
    const result = cursorPosToVisual('Hi', 10, 2, 'right')
    expect(result).toEqual({ row: 0, col: 10 })
  })

  it('left alignment returns normal position', () => {
    const result = cursorPosToVisual('Hi', 10, 1, 'left')
    expect(result).toEqual({ row: 0, col: 1 })
  })

  it('center alignment with wrapped text', () => {
    // "hello world" width 7 → ["hello", "world"]
    // "hello" offset = floor((7-5)/2) = 1
    // "world" offset = floor((7-5)/2) = 1
    // cursor at pos 0 ('h') → row 0, col 0 + offset 1 = 1
    const result = cursorPosToVisual('hello world', 7, 0, 'center')
    expect(result).toEqual({ row: 0, col: 1 })
  })

  it('center alignment cursor on second wrapped line', () => {
    // "hello world" width 7 → ["hello", "world"]
    // cursor at pos 6 ('w') → row 1, col 0 + offset 1 = 1
    const result = cursorPosToVisual('hello world', 7, 6, 'center')
    expect(result).toEqual({ row: 1, col: 1 })
  })
})

describe('renderTextLayerGrid', () => {
  const fg: RGBColor = [255, 0, 0]

  it('returns a grid of ANSI_ROWS x ANSI_COLS', () => {
    const bounds: Rect = { r0: 0, c0: 0, r1: 2, c1: 10 }
    const grid = renderTextLayerGrid('hi', bounds, fg)
    expect(grid).toHaveLength(ANSI_ROWS)
    expect(grid[0]).toHaveLength(ANSI_COLS)
  })

  it('places text characters with fg and TRANSPARENT_BG', () => {
    const bounds: Rect = { r0: 0, c0: 0, r1: 0, c1: 4 }
    const grid = renderTextLayerGrid('Hi', bounds, fg)
    expect(grid[0][0]).toEqual({ char: 'H', fg, bg: TRANSPARENT_BG })
    expect(grid[0][1]).toEqual({ char: 'i', fg, bg: TRANSPARENT_BG })
  })

  it('leaves cells outside bounds as default', () => {
    const bounds: Rect = { r0: 1, c0: 1, r1: 1, c1: 5 }
    const grid = renderTextLayerGrid('X', bounds, fg)
    expect(isDefaultCell(grid[0][0])).toBe(true)
    expect(isDefaultCell(grid[0][1])).toBe(true)
    expect(grid[1][1]).toEqual({ char: 'X', fg, bg: TRANSPARENT_BG })
  })

  it('leaves empty cells within bounds as default', () => {
    const bounds: Rect = { r0: 0, c0: 0, r1: 0, c1: 9 }
    const grid = renderTextLayerGrid('Hi', bounds, fg)
    // Cell after text should be default (transparent text layers only render chars)
    expect(isDefaultCell(grid[0][2])).toBe(true)
  })

  it('wraps text within bounds width', () => {
    const bounds: Rect = { r0: 0, c0: 0, r1: 1, c1: 4 }
    const grid = renderTextLayerGrid('hello world', bounds, fg)
    // 5 chars width (c0=0, c1=4), "hello" on row 0, "world" on row 1
    expect(grid[0][0].char).toBe('h')
    expect(grid[0][4].char).toBe('o')
    expect(grid[1][0].char).toBe('w')
  })

  it('truncates text that overflows bounds vertically', () => {
    const bounds: Rect = { r0: 0, c0: 0, r1: 0, c1: 4 }
    const grid = renderTextLayerGrid('hello world', bounds, fg)
    // Only 1 row available, "hello" fits, "world" overflows
    expect(grid[0][0].char).toBe('h')
    expect(isDefaultCell(grid[1][0])).toBe(true)
  })

  it('handles empty text', () => {
    const bounds: Rect = { r0: 0, c0: 0, r1: 2, c1: 10 }
    const grid = renderTextLayerGrid('', bounds, fg)
    expect(isDefaultCell(grid[0][0])).toBe(true)
  })

  it('positions text at correct grid offset', () => {
    const bounds: Rect = { r0: 5, c0: 10, r1: 5, c1: 14 }
    const grid = renderTextLayerGrid('AB', bounds, fg)
    expect(grid[5][10]).toEqual({ char: 'A', fg, bg: TRANSPARENT_BG })
    expect(grid[5][11]).toEqual({ char: 'B', fg, bg: TRANSPARENT_BG })
    expect(isDefaultCell(grid[5][9])).toBe(true)
  })

  it('handles bounds at grid edges', () => {
    const bounds: Rect = { r0: ANSI_ROWS - 1, c0: ANSI_COLS - 2, r1: ANSI_ROWS - 1, c1: ANSI_COLS - 1 }
    const grid = renderTextLayerGrid('XY', bounds, fg)
    expect(grid[ANSI_ROWS - 1][ANSI_COLS - 2]).toEqual({ char: 'X', fg, bg: TRANSPARENT_BG })
    expect(grid[ANSI_ROWS - 1][ANSI_COLS - 1]).toEqual({ char: 'Y', fg, bg: TRANSPARENT_BG })
  })
})

describe('renderTextLayerGrid with textFgColors', () => {
  const fg: RGBColor = [170, 170, 170]
  const red: RGBColor = [255, 0, 0]
  const blue: RGBColor = [0, 0, 255]

  it('uses per-character colors when textFgColors is provided', () => {
    const bounds: Rect = { r0: 0, c0: 0, r1: 0, c1: 4 }
    const grid = renderTextLayerGrid('AB', bounds, fg, [red, blue])
    expect(grid[0][0]).toEqual({ char: 'A', fg: red, bg: TRANSPARENT_BG })
    expect(grid[0][1]).toEqual({ char: 'B', fg: blue, bg: TRANSPARENT_BG })
  })

  it('falls back to textFg when textFgColors is undefined', () => {
    const bounds: Rect = { r0: 0, c0: 0, r1: 0, c1: 4 }
    const grid = renderTextLayerGrid('AB', bounds, fg)
    expect(grid[0][0]).toEqual({ char: 'A', fg, bg: TRANSPARENT_BG })
    expect(grid[0][1]).toEqual({ char: 'B', fg, bg: TRANSPARENT_BG })
  })

  it('tracks colors correctly through word-wrapped lines', () => {
    // "hello world" with width 5 wraps to ["hello", "world"]
    // The space at index 5 is consumed by the wrap, so "world" starts at raw index 6
    const bounds: Rect = { r0: 0, c0: 0, r1: 1, c1: 4 }
    const text = 'hello world'
    const colors: RGBColor[] = [
      [1,0,0], [2,0,0], [3,0,0], [4,0,0], [5,0,0], // h e l l o
      [6,0,0],                                        // space (consumed)
      [7,0,0], [8,0,0], [9,0,0], [10,0,0], [11,0,0], // w o r l d
    ]
    const grid = renderTextLayerGrid(text, bounds, fg, colors)
    // Row 0: h(1) e(2) l(3) l(4) o(5)
    expect(grid[0][0].fg).toEqual([1,0,0])
    expect(grid[0][4].fg).toEqual([5,0,0])
    // Row 1: w(7) o(8) r(9) l(10) d(11)
    expect(grid[1][0].fg).toEqual([7,0,0])
    expect(grid[1][4].fg).toEqual([11,0,0])
  })

  it('tracks colors correctly through newline breaks', () => {
    const bounds: Rect = { r0: 0, c0: 0, r1: 1, c1: 9 }
    const text = 'ab\ncd'
    const colors: RGBColor[] = [
      red, blue, // a, b
      [0,0,0],   // \n
      [0,255,0], [255,255,0], // c, d
    ]
    const grid = renderTextLayerGrid(text, bounds, fg, colors)
    expect(grid[0][0].fg).toEqual(red)
    expect(grid[0][1].fg).toEqual(blue)
    expect(grid[1][0].fg).toEqual([0,255,0])
    expect(grid[1][1].fg).toEqual([255,255,0])
  })
})

describe('justifyLine', () => {
  it('expands spaces to fill width', () => {
    expect(justifyLine('a b', 5)).toBe('a   b')
  })

  it('distributes extra space evenly across multiple gaps', () => {
    // "a b c" length 5, width 9 → 4 extra spaces across 2 gaps = 2 each
    expect(justifyLine('a b c', 9)).toBe('a   b   c')
  })

  it('distributes remainder left-to-right', () => {
    // "a b c" length 5, width 8 → 3 extra across 2 gaps: 2+1
    expect(justifyLine('a b c', 8)).toBe('a   b  c')
  })

  it('returns original line when single word', () => {
    expect(justifyLine('hello', 10)).toBe('hello')
  })

  it('returns original line when already at width', () => {
    expect(justifyLine('ab cd', 5)).toBe('ab cd')
  })
})

describe('renderTextLayerGrid with textAlign', () => {
  const fg: RGBColor = [255, 0, 0]

  it('center alignment offsets text to center of bounds', () => {
    // bounds width = 10, text "Hi" length 2, offset = floor((10-2)/2) = 4
    const bounds: Rect = { r0: 0, c0: 0, r1: 0, c1: 9 }
    const grid = renderTextLayerGrid('Hi', bounds, fg, undefined, 'center')
    expect(isDefaultCell(grid[0][0])).toBe(true)
    expect(isDefaultCell(grid[0][3])).toBe(true)
    expect(grid[0][4]).toEqual({ char: 'H', fg, bg: TRANSPARENT_BG })
    expect(grid[0][5]).toEqual({ char: 'i', fg, bg: TRANSPARENT_BG })
    expect(isDefaultCell(grid[0][6])).toBe(true)
  })

  it('right alignment offsets text to right edge of bounds', () => {
    // bounds width = 10, text "Hi" length 2, offset = 10-2 = 8
    const bounds: Rect = { r0: 0, c0: 0, r1: 0, c1: 9 }
    const grid = renderTextLayerGrid('Hi', bounds, fg, undefined, 'right')
    expect(isDefaultCell(grid[0][7])).toBe(true)
    expect(grid[0][8]).toEqual({ char: 'H', fg, bg: TRANSPARENT_BG })
    expect(grid[0][9]).toEqual({ char: 'i', fg, bg: TRANSPARENT_BG })
  })

  it('left alignment (default) places text at start of bounds', () => {
    const bounds: Rect = { r0: 0, c0: 0, r1: 0, c1: 9 }
    const grid = renderTextLayerGrid('Hi', bounds, fg, undefined, 'left')
    expect(grid[0][0]).toEqual({ char: 'H', fg, bg: TRANSPARENT_BG })
    expect(grid[0][1]).toEqual({ char: 'i', fg, bg: TRANSPARENT_BG })
  })

  it('justify expands inter-word spaces on non-last lines', () => {
    // bounds width = 10, "a b" wraps to one line (fits), then second line "c"
    // Two-line scenario: "hello world foo" with width 10
    // wrapText("hello world foo", 10) → ["hello", "world foo"]
    // "hello" is a line — only 1 word, stays left-aligned
    // "world foo" has 2 words in 10-width → already 9 chars, not the last line... wait
    // Let me use a clear example:
    // "ab cd\nef" width 10 → ["ab cd", "ef"]
    // "ab cd" is last line of first paragraph, so no justify. "ef" is second paragraph.
    // Better example: "a b c d" with width 5 → wrapText gives ["a b c", "d"] (actually no)
    // Let me think more carefully: "a b c d e f" with width 7
    // wrapText: "a b c d" fits? 7 chars. Yes. Then "e f". So ["a b c d", "e f"]
    // "a b c d" is not last line, justify it: 3 gaps, width 7, length 7 → already filled. No expansion needed.
    // Let me use: "ab cd ef gh" with width 8
    // wrapText: "ab cd ef" (8 chars), "gh". "ab cd ef" has 2 spaces in 8-width → already 8. No expand.
    // Try: "a b c d" with width 9, wrapText → ["a b c d"] single line, which is last. No justify.
    // Multi-line: "ab cd ef gh" with width 7
    // pos 0: "ab cd" (5 chars) then space at index 5, fits? 0+7=7 >= 11? No.
    // breakAt: look for space from pos 0+7=7 backwards: char[5]=' '. So line = "ab cd" (5), skip space.
    // pos 6: "ef gh" (5 chars). 6+7=13 >= 11. Rest fits. Line = "ef gh"
    // Result: ["ab cd", "ef gh"]
    // "ab cd" is not last line (of first paragraph), justify: width 7, line "ab cd" len 5, gap 1
    // extra = 7 - 5 = 2 → gap gets 2 extra spaces → "ab   cd"
    const bounds: Rect = { r0: 0, c0: 0, r1: 1, c1: 6 } // width 7
    const grid = renderTextLayerGrid('ab cd ef gh', bounds, fg, undefined, 'justify')
    // Row 0: "ab   cd" (justified, 7 chars)
    expect(grid[0][0].char).toBe('a')
    expect(grid[0][1].char).toBe('b')
    expect(grid[0][2].char).toBe(' ')
    expect(grid[0][3].char).toBe(' ')
    expect(grid[0][4].char).toBe(' ')
    expect(grid[0][5].char).toBe('c')
    expect(grid[0][6].char).toBe('d')
    // Row 1: "ef gh" (last line — left-aligned)
    expect(grid[1][0].char).toBe('e')
    expect(grid[1][1].char).toBe('f')
    expect(grid[1][2].char).toBe(' ')
    expect(grid[1][3].char).toBe('g')
    expect(grid[1][4].char).toBe('h')
  })

  it('justify leaves last line left-aligned', () => {
    const bounds: Rect = { r0: 0, c0: 0, r1: 1, c1: 6 } // width 7
    const grid = renderTextLayerGrid('ab cd ef gh', bounds, fg, undefined, 'justify')
    // Row 1 is last line "ef gh" — should be left-aligned, not justified
    expect(grid[1][0].char).toBe('e')
    expect(grid[1][5]).toEqual(expect.objectContaining({ char: ' ' }))
  })

  it('justify single-word line stays left-aligned', () => {
    // "hello\nworld" with width 10 → ["hello", "world"]
    // "hello" is last line of paragraph → not justified
    const bounds: Rect = { r0: 0, c0: 0, r1: 1, c1: 9 }
    const grid = renderTextLayerGrid('hello\nworld', bounds, fg, undefined, 'justify')
    expect(grid[0][0].char).toBe('h')
    expect(grid[0][4].char).toBe('o')
    expect(isDefaultCell(grid[0][5])).toBe(true)
  })

  it('center with offset bounds', () => {
    // bounds starting at c0=5, width 10
    const bounds: Rect = { r0: 0, c0: 5, r1: 0, c1: 14 }
    const grid = renderTextLayerGrid('Hi', bounds, fg, undefined, 'center')
    // offset = floor((10-2)/2) = 4, so col = 5 + 4 = 9
    expect(grid[0][9]).toEqual({ char: 'H', fg, bg: TRANSPARENT_BG })
    expect(grid[0][10]).toEqual({ char: 'i', fg, bg: TRANSPARENT_BG })
    expect(isDefaultCell(grid[0][8])).toBe(true)
  })

  it('right alignment with per-character colors', () => {
    const red: RGBColor = [255, 0, 0]
    const blue: RGBColor = [0, 0, 255]
    const bounds: Rect = { r0: 0, c0: 0, r1: 0, c1: 9 }
    const grid = renderTextLayerGrid('AB', bounds, fg, [red, blue], 'right')
    // offset = 10 - 2 = 8
    expect(grid[0][8]).toEqual({ char: 'A', fg: red, bg: TRANSPARENT_BG })
    expect(grid[0][9]).toEqual({ char: 'B', fg: blue, bg: TRANSPARENT_BG })
  })
})
