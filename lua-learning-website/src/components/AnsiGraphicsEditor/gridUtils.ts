import type { AnsiTerminalHandle } from '../AnsiTerminalPanel/AnsiTerminalPanel'
import type { AnsiCell, AnsiGrid, BrushSettings, RGBColor } from './types'
import { ANSI_COLS, ANSI_ROWS, DEFAULT_BG, DEFAULT_CELL, DEFAULT_FG, HALF_BLOCK, TRANSPARENT_HALF } from './types'
import { bresenhamLine, midpointEllipse } from './lineAlgorithm'
import { rgbEqual } from './layerUtils'
import { blendRgb } from './colorUtils'

export function cloneCell(cell: AnsiCell): AnsiCell {
  return { char: cell.char, fg: [...cell.fg] as RGBColor, bg: [...cell.bg] as RGBColor }
}

export function cloneDefaultCell(): AnsiCell {
  return { ...DEFAULT_CELL, fg: [...DEFAULT_CELL.fg] as RGBColor, bg: [...DEFAULT_CELL.bg] as RGBColor }
}

export function cloneGrid(grid: AnsiGrid): AnsiGrid {
  return grid.map(row => row.map(cloneCell))
}

export function createEmptyGrid(): AnsiGrid {
  return Array.from({ length: ANSI_ROWS }, () =>
    Array.from({ length: ANSI_COLS }, () => ({ ...DEFAULT_CELL }))
  )
}

export type ColorTransform = (c: RGBColor) => RGBColor

export function writeCellToTerminal(
  handle: AnsiTerminalHandle,
  row: number,
  col: number,
  cell: { char: string; fg: RGBColor; bg: RGBColor },
  colorTransform?: ColorTransform,
): void {
  const fg = colorTransform ? colorTransform(cell.fg) : cell.fg
  const bg = colorTransform ? colorTransform(cell.bg) : cell.bg
  const posSeq = `\x1b[${row + 1};${col + 1}H`
  const fgSeq = `\x1b[38;2;${fg[0]};${fg[1]};${fg[2]}m`
  const bgSeq = `\x1b[48;2;${bg[0]};${bg[1]};${bg[2]}m`
  handle.write(`${posSeq}${fgSeq}${bgSeq}${cell.char}\x1b[0m`)
}

export function renderFullGrid(handle: AnsiTerminalHandle, grid: AnsiGrid, colorTransform?: ColorTransform): void {
  handle.write('\x1b[2J\x1b[?25l')
  for (let r = 0; r < ANSI_ROWS; r++) {
    for (let c = 0; c < ANSI_COLS; c++) {
      writeCellToTerminal(handle, r, c, grid[r][c], colorTransform)
    }
  }
}

export function isInBounds(row: number, col: number): boolean {
  return row >= 0 && row < ANSI_ROWS && col >= 0 && col < ANSI_COLS
}

export function getCellHalfFromMouse(e: MouseEvent, container: HTMLElement): { row: number; col: number; isTopHalf: boolean } | null {
  const rect = container.getBoundingClientRect()
  const col = Math.floor((e.clientX - rect.left) * ANSI_COLS / rect.width)
  const fractionalRow = (e.clientY - rect.top) * ANSI_ROWS / rect.height
  const row = Math.floor(fractionalRow)
  if (!isInBounds(row, col)) return null
  const isTopHalf = (fractionalRow - row) < 0.5
  return { row, col, isTopHalf }
}

export function computePixelCell(existingCell: AnsiCell, paintColor: RGBColor, isTopHalf: boolean): AnsiCell {
  const isPixelCell = existingCell.char === HALF_BLOCK
  const existingTop: RGBColor = isPixelCell ? [...existingCell.fg] as RGBColor : [...TRANSPARENT_HALF] as RGBColor
  const existingBottom: RGBColor = isPixelCell ? [...existingCell.bg] as RGBColor : [...TRANSPARENT_HALF] as RGBColor

  return {
    char: HALF_BLOCK,
    fg: isTopHalf ? [...paintColor] as RGBColor : existingTop,
    bg: isTopHalf ? existingBottom : [...paintColor] as RGBColor,
  }
}

export function computeErasePixelCell(existingCell: AnsiCell, isTopHalf: boolean): AnsiCell {
  // Erasing a default cell is a no-op
  if (existingCell.char === ' ' && rgbEqual(existingCell.fg, DEFAULT_FG) && rgbEqual(existingCell.bg, DEFAULT_BG)) {
    return { ...DEFAULT_CELL }
  }

  const isPixelCell = existingCell.char === HALF_BLOCK
  const existingTop: RGBColor = isPixelCell ? [...existingCell.fg] as RGBColor : [...existingCell.bg] as RGBColor
  const existingBottom: RGBColor = [...existingCell.bg] as RGBColor

  const newTop = isTopHalf ? [...TRANSPARENT_HALF] as RGBColor : existingTop
  const newBottom = isTopHalf ? existingBottom : [...TRANSPARENT_HALF] as RGBColor

  if (rgbEqual(newTop, TRANSPARENT_HALF) && rgbEqual(newBottom, TRANSPARENT_HALF)) {
    return { ...DEFAULT_CELL }
  }

  return { char: HALF_BLOCK, fg: newTop, bg: newBottom }
}

export type LineBrush = Omit<BrushSettings, 'tool'>

function effectivePaintColor(brush: LineBrush): RGBColor {
  return brush.mode === 'blend-pixel' ? blendRgb(brush.fg, brush.bg, 0.25) : brush.fg
}

export interface CellHalf {
  row: number
  col: number
  isTopHalf: boolean
}

export function parseCellKey(key: string): [number, number] {
  const [r, c] = key.split(',').map(Number)
  return [r, c]
}

export function computeRectCells(
  start: CellHalf,
  end: CellHalf,
  brush: LineBrush,
  baseGrid: AnsiGrid,
  filled: boolean,
): Map<string, AnsiCell> {
  const cells = new Map<string, AnsiCell>()

  if (brush.mode !== 'brush') {
    const py0 = start.row * 2 + (start.isTopHalf ? 0 : 1)
    const py1 = end.row * 2 + (end.isTopHalf ? 0 : 1)
    const minPY = Math.min(py0, py1)
    const maxPY = Math.max(py0, py1)
    const minCX = Math.min(start.col, end.col)
    const maxCX = Math.max(start.col, end.col)

    for (let py = minPY; py <= maxPY; py++) {
      for (let cx = minCX; cx <= maxCX; cx++) {
        const isPerimeter = py === minPY || py === maxPY || cx === minCX || cx === maxCX
        if (!filled && !isPerimeter) continue
        const row = Math.floor(py / 2)
        if (!isInBounds(row, cx)) continue
        const isTop = py % 2 === 0
        const key = `${row},${cx}`
        const existing = cells.get(key) ?? baseGrid[row][cx]
        cells.set(key, brush.mode === 'eraser'
          ? computeErasePixelCell(existing, isTop)
          : computePixelCell(existing, effectivePaintColor(brush), isTop))
      }
    }
  } else {
    const minRow = Math.min(start.row, end.row)
    const maxRow = Math.max(start.row, end.row)
    const minCol = Math.min(start.col, end.col)
    const maxCol = Math.max(start.col, end.col)

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const isPerimeter = r === minRow || r === maxRow || c === minCol || c === maxCol
        if (!filled && !isPerimeter) continue
        if (!isInBounds(r, c)) continue
        const key = `${r},${c}`
        cells.set(key, { char: brush.char, fg: [...brush.fg] as RGBColor, bg: [...brush.bg] as RGBColor })
      }
    }
  }

  return cells
}

export function computeBorderCells(
  start: CellHalf,
  end: CellHalf,
  brush: LineBrush,
  baseGrid: AnsiGrid,
): Map<string, AnsiCell> {
  if (brush.mode !== 'brush' || !brush.borderStyle) {
    return computeRectCells(start, end, brush, baseGrid, false)
  }

  const cells = new Map<string, AnsiCell>()
  const minRow = Math.min(start.row, end.row)
  const maxRow = Math.max(start.row, end.row)
  const minCol = Math.min(start.col, end.col)
  const maxCol = Math.max(start.col, end.col)
  const { tl, t, tr, l, r, bl, b, br } = brush.borderStyle

  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      const isTop = row === minRow
      const isBottom = row === maxRow
      const isLeft = col === minCol
      const isRight = col === maxCol

      let char: string | null = null
      if (isTop && isLeft) char = tl
      else if (isTop && isRight) char = tr
      else if (isBottom && isLeft) char = bl
      else if (isBottom && isRight) char = br
      else if (isTop) char = t
      else if (isBottom) char = b
      else if (isLeft) char = l
      else if (isRight) char = r

      if (char === null) continue
      if (!isInBounds(row, col)) continue
      cells.set(`${row},${col}`, { char, fg: [...brush.fg] as RGBColor, bg: [...brush.bg] as RGBColor })
    }
  }

  return cells
}

function insideEllipse(dx: number, dy: number, a: number, b: number): boolean {
  return a === 0 || b === 0 || (dx * dx) / (a * a) + (dy * dy) / (b * b) <= 1
}

export function computeOvalCells(
  start: CellHalf, end: CellHalf, brush: LineBrush, baseGrid: AnsiGrid, filled: boolean,
): Map<string, AnsiCell> {
  const cells = new Map<string, AnsiCell>()

  if (brush.mode !== 'brush') {
    const py0 = start.row * 2 + (start.isTopHalf ? 0 : 1)
    const py1 = end.row * 2 + (end.isTopHalf ? 0 : 1)
    const minPY = Math.min(py0, py1)
    const maxPY = Math.max(py0, py1)
    const minCX = Math.min(start.col, end.col)
    const maxCX = Math.max(start.col, end.col)
    const cx = (minCX + maxCX) / 2
    const cy = (minPY + maxPY) / 2
    const a = (maxCX - minCX) / 2
    const b = (maxPY - minPY) / 2

    function paintPixel(col: number, py: number): void {
      const row = Math.floor(py / 2)
      if (!isInBounds(row, col)) return
      const isTop = py % 2 === 0
      const key = `${row},${col}`
      const existing = cells.get(key) ?? baseGrid[row][col]
      cells.set(key, brush.mode === 'eraser'
        ? computeErasePixelCell(existing, isTop) : computePixelCell(existing, effectivePaintColor(brush), isTop))
    }

    if (filled) {
      for (let py = minPY; py <= maxPY; py++) {
        for (let col = minCX; col <= maxCX; col++) {
          if (insideEllipse(col - cx, py - cy, a, b)) paintPixel(col, py)
        }
      }
    }
    for (const { x: col, y: py } of midpointEllipse(cx, cy, a, b)) paintPixel(col, py)
  } else {
    const minRow = Math.min(start.row, end.row)
    const maxRow = Math.max(start.row, end.row)
    const minCol = Math.min(start.col, end.col)
    const maxCol = Math.max(start.col, end.col)
    const cx = (minCol + maxCol) / 2
    const cy = (minRow + maxRow) / 2
    const a = (maxCol - minCol) / 2
    const b = (maxRow - minRow) / 2

    function makeBrushCell(): AnsiCell {
      return { char: brush.char, fg: [...brush.fg] as RGBColor, bg: [...brush.bg] as RGBColor }
    }

    if (filled) {
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          if (insideEllipse(c - cx, r - cy, a, b) && isInBounds(r, c)) cells.set(`${r},${c}`, makeBrushCell())
        }
      }
    }
    for (const { x: c, y: r } of midpointEllipse(cx, cy, a, b)) {
      if (isInBounds(r, c)) cells.set(`${r},${c}`, makeBrushCell())
    }
  }
  return cells
}

export function computeLineCells(
  start: CellHalf,
  end: CellHalf,
  brush: LineBrush,
  baseGrid: AnsiGrid,
): Map<string, AnsiCell> {
  const cells = new Map<string, AnsiCell>()

  if (brush.mode !== 'brush') {
    const py0 = start.row * 2 + (start.isTopHalf ? 0 : 1)
    const py1 = end.row * 2 + (end.isTopHalf ? 0 : 1)
    const points = bresenhamLine(start.col, py0, end.col, py1)

    for (const { x: col, y: pixelY } of points) {
      const row = Math.floor(pixelY / 2)
      if (!isInBounds(row, col)) continue
      const isTop = pixelY % 2 === 0
      const key = `${row},${col}`
      const existing = cells.get(key) ?? baseGrid[row][col]
      cells.set(key, brush.mode === 'eraser'
        ? computeErasePixelCell(existing, isTop)
        : computePixelCell(existing, effectivePaintColor(brush), isTop))
    }
  } else {
    const points = bresenhamLine(start.col, start.row, end.col, end.row)

    for (const { x: col, y: row } of points) {
      if (!isInBounds(row, col)) continue
      const key = `${row},${col}`
      cells.set(key, { char: brush.char, fg: [...brush.fg] as RGBColor, bg: [...brush.bg] as RGBColor })
    }
  }

  return cells
}

function readPixelColor(grid: AnsiGrid, row: number, col: number, isTopHalf: boolean): RGBColor {
  const cell = grid[row][col]
  if (cell.char === HALF_BLOCK) {
    return isTopHalf ? cell.fg : cell.bg
  }
  return cell.bg
}

export function computeFloodFillCells(
  startRow: number, startCol: number,
  brush: LineBrush,
  baseGrid: AnsiGrid,
  isTopHalf?: boolean,
): Map<string, AnsiCell> {
  const cells = new Map<string, AnsiCell>()
  const rows = baseGrid.length
  const cols = baseGrid[0].length

  if (brush.mode !== 'brush') {
    const startCell = baseGrid[startRow][startCol]

    if (startCell.char !== HALF_BLOCK) {
      // Cell-level BFS: match non-half-block cells by full identity (char+fg+bg)
      if (brush.mode === 'eraser' && startCell.char === DEFAULT_CELL.char
        && rgbEqual(startCell.fg, DEFAULT_CELL.fg) && rgbEqual(startCell.bg, DEFAULT_CELL.bg)) return cells

      const visited = new Set<string>()
      const queue: [number, number][] = [[startRow, startCol]]
      visited.add(`${startRow},${startCol}`)

      while (queue.length > 0) {
        const [r, c] = queue.shift()!
        const cell = baseGrid[r][c]
        if (cell.char === HALF_BLOCK || cell.char !== startCell.char
          || !rgbEqual(cell.fg, startCell.fg) || !rgbEqual(cell.bg, startCell.bg)) continue

        const key = `${r},${c}`
        const paintColor = effectivePaintColor(brush)
        let result = brush.mode === 'eraser'
          ? computeErasePixelCell(cell, true) : computePixelCell(cell, paintColor, true)
        result = brush.mode === 'eraser'
          ? computeErasePixelCell(result, false) : computePixelCell(result, paintColor, false)
        cells.set(key, result)

        const neighbors: [number, number][] = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]
        for (const [nr, nc] of neighbors) {
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
          const nk = `${nr},${nc}`
          if (visited.has(nk)) continue
          visited.add(nk)
          queue.push([nr, nc])
        }
      }
    } else {
      // Pixel-level BFS for half-block starting cell
      const startPY = startRow * 2 + (isTopHalf ? 0 : 1)
      const maxPY = rows * 2
      const targetColor = readPixelColor(baseGrid, startRow, startCol, !!isTopHalf)
      const noopColor = brush.mode === 'eraser' ? TRANSPARENT_HALF : effectivePaintColor(brush)
      if (rgbEqual(targetColor, noopColor)) return cells

      const visited = new Set<string>()
      const queue: [number, number][] = [[startPY, startCol]]
      visited.add(`${startPY},${startCol}`)

      while (queue.length > 0) {
        const [py, cx] = queue.shift()!
        const row = Math.floor(py / 2)
        const isTop = py % 2 === 0
        const color = readPixelColor(baseGrid, row, cx, isTop)
        if (!rgbEqual(color, targetColor)) continue

        const key = `${row},${cx}`
        const existing = cells.get(key) ?? baseGrid[row][cx]
        cells.set(key, brush.mode === 'eraser'
          ? computeErasePixelCell(existing, isTop)
          : computePixelCell(existing, effectivePaintColor(brush), isTop))

        const neighbors: [number, number][] = [[py - 1, cx], [py + 1, cx], [py, cx - 1], [py, cx + 1]]
        for (const [ny, nx] of neighbors) {
          if (ny < 0 || ny >= maxPY || nx < 0 || nx >= cols) continue
          const nk = `${ny},${nx}`
          if (visited.has(nk)) continue
          visited.add(nk)
          queue.push([ny, nx])
        }
      }
    }
  } else {
    const target = baseGrid[startRow][startCol]
    if (target.char === brush.char && rgbEqual(target.fg, brush.fg) && rgbEqual(target.bg, brush.bg)) return cells

    const visited = new Set<string>()
    const queue: [number, number][] = [[startRow, startCol]]
    visited.add(`${startRow},${startCol}`)

    while (queue.length > 0) {
      const [r, c] = queue.shift()!
      const cell = baseGrid[r][c]
      if (cell.char !== target.char || !rgbEqual(cell.fg, target.fg) || !rgbEqual(cell.bg, target.bg)) continue

      const key = `${r},${c}`
      cells.set(key, { char: brush.char, fg: [...brush.fg] as RGBColor, bg: [...brush.bg] as RGBColor })

      const neighbors: [number, number][] = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]
      for (const [nr, nc] of neighbors) {
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
        const nk = `${nr},${nc}`
        if (visited.has(nk)) continue
        visited.add(nk)
        queue.push([nr, nc])
      }
    }
  }

  return cells
}
