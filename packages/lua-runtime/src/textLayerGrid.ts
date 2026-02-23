/**
 * Text layer grid rendering for ANSI screen compositing.
 *
 * Ported from lua-learning-website/src/components/AnsiGraphicsEditor/textLayerGrid.ts.
 * Only includes the subset needed for runtime compositing (no cursor logic).
 */

import type { AnsiGrid, RGBColor, Rect, TextAlign } from './screenTypes'
import { ANSI_COLS, ANSI_ROWS, DEFAULT_CELL, TRANSPARENT_BG } from './screenTypes'

/**
 * Computes the length of the next wrapped-line segment starting at `paraOff`
 * within a paragraph, and how many characters to skip after it (0 or 1 for
 * the consumed space at a word-break).
 */
function computeLineSegment(para: string, paraOff: number, width: number): { lineLen: number; skip: number } {
  if (paraOff + width >= para.length) {
    return { lineLen: para.length - paraOff, skip: 0 }
  }
  for (let i = paraOff + width; i > paraOff; i--) {
    if (para[i] === ' ') {
      return { lineLen: i - paraOff, skip: 1 }
    }
  }
  return { lineLen: width, skip: 0 }
}

/**
 * Greedy word-wrap: splits text into lines that fit within `width` columns.
 * - `\n` forces a line break
 * - Words longer than `width` are broken by character
 */
export function wrapText(text: string, width: number): string[] {
  if (text === '') return []
  const paragraphs = text.split('\n')
  const lines: string[] = []
  for (const para of paragraphs) {
    if (para === '') { lines.push(''); continue }
    let pos = 0
    while (pos < para.length) {
      const { lineLen, skip } = computeLineSegment(para, pos, width)
      lines.push(para.slice(pos, pos + lineLen))
      pos += lineLen + skip
    }
  }
  return lines
}

/**
 * Builds a mapping from each wrapped-output character to its raw text index.
 * Returns an array of lines, where each line is an array of raw indices.
 */
export function buildRawIndexMap(text: string, width: number): number[][] {
  if (text === '') return []
  const paragraphs = text.split('\n')
  const result: number[][] = []
  let rawPos = 0

  for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
    if (pIdx > 0) rawPos++ // skip the '\n'
    const para = paragraphs[pIdx]
    if (para === '') { result.push([]); continue }

    let paraOff = 0
    while (paraOff < para.length) {
      const { lineLen, skip } = computeLineSegment(para, paraOff, width)
      const indices: number[] = []
      for (let i = 0; i < lineLen; i++) {
        indices.push(rawPos + paraOff + i)
      }
      result.push(indices)
      paraOff += lineLen + skip
    }
    rawPos += para.length
  }
  return result
}

/**
 * Expands inter-word spaces in a line to fill the given width.
 * Single-word lines are returned unchanged.
 */
export function justifyLine(line: string, width: number): string {
  const words = line.split(' ').filter(w => w.length > 0)
  if (words.length <= 1) return line
  const totalChars = words.reduce((sum, w) => sum + w.length, 0)
  const totalSpaces = width - totalChars
  const gaps = words.length - 1
  const baseGap = Math.floor(totalSpaces / gaps)
  const remainder = totalSpaces % gaps
  let result = ''
  for (let i = 0; i < words.length; i++) {
    result += words[i]
    if (i < gaps) {
      const extra = i < remainder ? 1 : 0
      result += ' '.repeat(baseGap + extra)
    }
  }
  return result
}

/**
 * Renders text into an 80x25 AnsiGrid within the given bounds.
 * Characters use `{ char, fg: textFg, bg: TRANSPARENT_BG }`.
 * Text is word-wrapped to bounds width. Overflow is truncated.
 *
 * When `textFgColors` is provided, each character uses its per-character
 * color instead of the uniform `textFg`.
 */
export function renderTextLayerGrid(text: string, bounds: Rect, textFg: RGBColor, textFgColors?: RGBColor[], textAlign?: TextAlign): AnsiGrid {
  const grid: AnsiGrid = Array.from({ length: ANSI_ROWS }, () =>
    Array.from({ length: ANSI_COLS }, () => ({ ...DEFAULT_CELL }))
  )
  if (!text) return grid

  const width = bounds.c1 - bounds.c0 + 1
  const maxRows = bounds.r1 - bounds.r0 + 1
  const lines = wrapText(text, width)
  const indexMap = textFgColors ? buildRawIndexMap(text, width) : null
  const align = textAlign ?? 'left'

  // Determine which lines are "last in their paragraph" for justify
  const lastLineOfParagraph = new Set<number>()
  if (align === 'justify') {
    let visualLine = 0
    for (const para of text.split('\n')) {
      if (para === '') { lastLineOfParagraph.add(visualLine); visualLine++; continue }
      const paraLines = wrapText(para, width)
      visualLine += paraLines.length
      lastLineOfParagraph.add(visualLine - 1)
    }
  }

  for (let lineIdx = 0; lineIdx < Math.min(lines.length, maxRows); lineIdx++) {
    const row = bounds.r0 + lineIdx
    if (row < 0 || row >= ANSI_ROWS) continue
    let line = lines[lineIdx]
    const rawIndices = indexMap?.[lineIdx]

    // Compute offset/justify
    let offset = 0
    if (align === 'center') {
      offset = Math.floor((width - line.length) / 2)
    } else if (align === 'right') {
      offset = width - line.length
    } else if (align === 'justify') {
      const isLast = lastLineOfParagraph.has(lineIdx)
      if (!isLast && line.includes(' ') && line.length < width) {
        line = justifyLine(line, width)
      }
    }

    for (let charIdx = 0; charIdx < Math.min(line.length, width); charIdx++) {
      const col = bounds.c0 + offset + charIdx
      if (col < 0 || col >= ANSI_COLS) continue
      const fg = (textFgColors && rawIndices && charIdx < rawIndices.length)
        ? textFgColors[rawIndices[charIdx]] ?? textFg
        : textFg
      grid[row][col] = { char: line[charIdx], fg, bg: TRANSPARENT_BG }
    }
  }

  return grid
}
