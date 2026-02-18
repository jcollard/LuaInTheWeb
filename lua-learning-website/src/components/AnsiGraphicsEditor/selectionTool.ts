import type { AnsiCell, AnsiGrid, Rect } from './types'
import { ANSI_COLS, ANSI_ROWS } from './types'
import { extractRegionCells, computeSelectionMoveCells } from './gridUtils'

export interface SelectionDeps {
  container: HTMLElement
  selectionRef: React.RefObject<HTMLDivElement | null>
  commitPendingRef: React.MutableRefObject<(() => void) | null>
  restorePreview: () => void
  writePreviewCells: (cells: Map<string, AnsiCell>) => void
  commitCells: (cells: Map<string, AnsiCell>) => void
  pushSnapshot: () => void
  getActiveGrid: () => AnsiGrid
  hideDimension: () => void
}

export interface SelectionHandlers {
  onMouseDown: (row: number, col: number) => void
  onMouseMove: (row: number, col: number) => void
  onMouseUp: () => void
}

export function createSelectionHandlers(deps: SelectionDeps): SelectionHandlers {
  const { container, selectionRef, commitPendingRef } = deps
  const { restorePreview, writePreviewCells, commitCells, pushSnapshot, getActiveGrid, hideDimension } = deps

  let phase: 'idle' | 'selecting' | 'selected' | 'dragging' = 'idle'
  let selRect: Rect | null = null
  let selOrigRect: Rect | null = null
  let captured = new Map<string, AnsiCell>()
  let dragStart: { row: number; col: number } | null = null

  function positionOverlay(r0: number, c0: number, r1: number, c1: number): void {
    const el = selectionRef.current
    if (!el) return
    const rect = container.getBoundingClientRect()
    const cellW = rect.width / ANSI_COLS
    const cellH = rect.height / ANSI_ROWS
    const minR = Math.min(r0, r1), maxR = Math.max(r0, r1)
    const minC = Math.min(c0, c1), maxC = Math.max(c0, c1)
    el.style.display = 'block'
    el.style.left = `${rect.left + minC * cellW}px`
    el.style.top = `${rect.top + minR * cellH}px`
    el.style.width = `${(maxC - minC + 1) * cellW}px`
    el.style.height = `${(maxR - minR + 1) * cellH}px`
  }

  function hideOverlay(): void {
    if (selectionRef.current) selectionRef.current.style.display = 'none'
  }

  function isInside(row: number, col: number): boolean {
    if (!selRect) return false
    const minR = Math.min(selRect.r0, selRect.r1), maxR = Math.max(selRect.r0, selRect.r1)
    const minC = Math.min(selRect.c0, selRect.c1), maxC = Math.max(selRect.c0, selRect.c1)
    return row >= minR && row <= maxR && col >= minC && col <= maxC
  }

  function clear(): void {
    phase = 'idle'
    selRect = null
    selOrigRect = null
    captured = new Map()
    dragStart = null
    hideOverlay()
  }

  function commitIfNeeded(): void {
    if (!selRect || !selOrigRect) { clear(); return }
    const moved = selRect.r0 !== selOrigRect.r0 || selRect.c0 !== selOrigRect.c0
      || selRect.r1 !== selOrigRect.r1 || selRect.c1 !== selOrigRect.c1
    if (moved) {
      restorePreview()
      pushSnapshot()
      commitCells(computeSelectionMoveCells(
        captured, selOrigRect.r0, selOrigRect.c0, selRect.r0, selRect.c0, ANSI_ROWS, ANSI_COLS,
      ))
    } else {
      restorePreview()
    }
    clear()
  }

  function renderPreview(): void {
    restorePreview()
    if (!selRect || !selOrigRect) return
    writePreviewCells(computeSelectionMoveCells(
      captured, selOrigRect.r0, selOrigRect.c0, selRect.r0, selRect.c0, ANSI_ROWS, ANSI_COLS,
    ))
  }

  commitPendingRef.current = commitIfNeeded

  function onMouseDown(row: number, col: number): void {
    if (phase === 'idle') {
      phase = 'selecting'
      selRect = { r0: row, c0: col, r1: row, c1: col }
      positionOverlay(row, col, row, col)
    } else if (phase === 'selected') {
      if (isInside(row, col)) {
        phase = 'dragging'
        dragStart = { row, col }
      } else {
        commitIfNeeded()
        phase = 'selecting'
        selRect = { r0: row, c0: col, r1: row, c1: col }
        positionOverlay(row, col, row, col)
      }
    }
  }

  function onMouseMove(row: number, col: number): void {
    if (phase === 'selecting' && selRect) {
      selRect.r1 = row
      selRect.c1 = col
      positionOverlay(selRect.r0, selRect.c0, selRect.r1, selRect.c1)
    } else if (phase === 'dragging' && dragStart && selOrigRect) {
      const dr = row - dragStart.row, dc = col - dragStart.col
      selRect = { r0: selOrigRect.r0 + dr, c0: selOrigRect.c0 + dc, r1: selOrigRect.r1 + dr, c1: selOrigRect.c1 + dc }
      renderPreview()
      positionOverlay(selRect.r0, selRect.c0, selRect.r1, selRect.c1)
    }
  }

  function onMouseUp(): void {
    if (phase === 'selecting' && selRect) {
      const nr: Rect = {
        r0: Math.min(selRect.r0, selRect.r1), c0: Math.min(selRect.c0, selRect.c1),
        r1: Math.max(selRect.r0, selRect.r1), c1: Math.max(selRect.c0, selRect.c1),
      }
      selRect = nr
      selOrigRect = { ...nr }
      captured = extractRegionCells(getActiveGrid(), nr.r0, nr.c0, nr.r1, nr.c1)
      phase = 'selected'
      positionOverlay(nr.r0, nr.c0, nr.r1, nr.c1)
      hideDimension()
    } else if (phase === 'dragging') {
      phase = 'selected'
    }
  }

  return { onMouseDown, onMouseMove, onMouseUp }
}
