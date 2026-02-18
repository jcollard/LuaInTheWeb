import type { Layer, Rect, RGBColor, TextLayer } from './types'
import { ANSI_COLS, ANSI_ROWS } from './types'
import { cursorPosToVisual } from './textLayerGrid'

type Handle = 'top-left' | 'top' | 'top-right' | 'left' | 'right' | 'bottom-left' | 'bottom' | 'bottom-right' | 'inside' | 'outside'

export function detectHandle(row: number, col: number, bounds: Rect): Handle {
  const { r0, c0, r1, c1 } = bounds
  if (row < r0 || row > r1 || col < c0 || col > c1) return 'outside'
  const onTop = row === r0
  const onBottom = row === r1
  const onLeft = col === c0
  const onRight = col === c1
  if (onTop && onLeft) return 'top-left'
  if (onTop && onRight) return 'top-right'
  if (onBottom && onLeft) return 'bottom-left'
  if (onBottom && onRight) return 'bottom-right'
  if (onTop) return 'top'
  if (onBottom) return 'bottom'
  if (onLeft) return 'left'
  if (onRight) return 'right'
  return 'inside'
}

export type TextToolPhase = 'idle' | 'drawing' | 'editing' | 'moving' | 'resizing'

export interface TextToolDeps {
  layersRef: React.RefObject<Layer[]>
  activeLayerIdRef: React.RefObject<string>
  brushRef: React.RefObject<{ fg: RGBColor }>
  addTextLayer: (name: string, bounds: Rect, textFg: RGBColor) => void
  updateTextLayer: (id: string, updates: { text?: string; bounds?: Rect; textFg?: RGBColor; textFgColors?: RGBColor[]; textAlign?: import('./types').TextAlign }) => void
  pushSnapshot: () => void
  rerenderGrid: () => void
  textBoundsRef: React.RefObject<HTMLDivElement | null>
  textCursorRef: React.RefObject<HTMLDivElement | null>
  containerRef: React.RefObject<HTMLElement | null>
  onExitEditing?: () => void
}

export interface TextToolHandlers {
  onMouseDown: (row: number, col: number) => void
  onMouseMove: (row: number, col: number) => void
  onMouseUp: () => void
  onKeyDown: (e: KeyboardEvent) => void
  commitIfEditing: () => void
  getPhase: () => TextToolPhase
  refreshOverlays: () => void
}

function findTextLayerAtPosition(layers: Layer[], row: number, col: number): TextLayer | null {
  // Search top-to-bottom for a text layer whose bounds contain (row, col)
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i]
    if (layer.type !== 'text') continue
    const { r0, c0, r1, c1 } = layer.bounds
    if (row >= r0 && row <= r1 && col >= c0 && col <= c1) return layer
  }
  return null
}

export function createTextToolHandlers(deps: TextToolDeps): TextToolHandlers {
  let phase: TextToolPhase = 'idle'
  let editingLayerId: string | null = null
  let cursorPos = 0 // position in text string

  // Drawing state
  let drawStart: { row: number; col: number } | null = null
  let drawEnd: { row: number; col: number } | null = null

  // Move/resize state
  let dragStart: { row: number; col: number } | null = null
  let dragBoundsStart: Rect | null = null
  let resizeHandle: Handle | null = null

  function getEditingLayer(): TextLayer | null {
    if (!editingLayerId) return null
    const layer = deps.layersRef.current.find(l => l.id === editingLayerId)
    if (!layer || layer.type !== 'text') return null
    return layer
  }

  function hideBoundsOverlay(): void {
    if (deps.textBoundsRef.current) deps.textBoundsRef.current.style.display = 'none'
  }

  function hideCursorOverlay(): void {
    if (deps.textCursorRef.current) deps.textCursorRef.current.style.display = 'none'
  }

  function positionBoundsOverlay(bounds: Rect): void {
    const el = deps.textBoundsRef.current
    const container = deps.containerRef.current
    if (!el || !container) return
    const rect = container.getBoundingClientRect()
    const cellW = rect.width / ANSI_COLS
    const cellH = rect.height / ANSI_ROWS
    el.style.display = 'block'
    el.style.left = `${rect.left + bounds.c0 * cellW}px`
    el.style.top = `${rect.top + bounds.r0 * cellH}px`
    el.style.width = `${(bounds.c1 - bounds.c0 + 1) * cellW}px`
    el.style.height = `${(bounds.r1 - bounds.r0 + 1) * cellH}px`
  }

  function positionCursorOverlay(): void {
    const layer = getEditingLayer()
    const el = deps.textCursorRef.current
    const container = deps.containerRef.current
    if (!el || !container || !layer) { hideCursorOverlay(); return }
    const rect = container.getBoundingClientRect()
    const cellW = rect.width / ANSI_COLS
    const cellH = rect.height / ANSI_ROWS
    const boundsWidth = layer.bounds.c1 - layer.bounds.c0 + 1
    const visual = cursorPosToVisual(layer.text, boundsWidth, cursorPos, layer.textAlign)
    const gridRow = layer.bounds.r0 + visual.row
    const gridCol = layer.bounds.c0 + visual.col
    if (gridRow > layer.bounds.r1 || gridCol > layer.bounds.c1) {
      hideCursorOverlay()
      return
    }
    el.style.display = 'block'
    el.style.left = `${rect.left + gridCol * cellW}px`
    el.style.top = `${rect.top + gridRow * cellH}px`
    el.style.width = `${cellW}px`
    el.style.height = `${cellH}px`
  }

  function enterEditing(layerId: string): void {
    phase = 'editing'
    editingLayerId = layerId
    const layer = getEditingLayer()
    if (layer) {
      cursorPos = layer.text.length
      positionBoundsOverlay(layer.bounds)
      positionCursorOverlay()
    }
  }

  function exitEditing(): void {
    phase = 'idle'
    editingLayerId = null
    cursorPos = 0
    hideBoundsOverlay()
    hideCursorOverlay()
    deps.onExitEditing?.()
  }

  function onMouseDown(row: number, col: number): void {
    if (phase === 'idle') {
      // Check if clicking on an existing text layer
      const activeId = deps.activeLayerIdRef.current
      const activeLayer = deps.layersRef.current.find(l => l.id === activeId)
      if (activeLayer?.type === 'text') {
        const handle = detectHandle(row, col, activeLayer.bounds)
        if (handle !== 'outside') {
          deps.pushSnapshot()
          enterEditing(activeLayer.id)
          return
        }
      }
      // Check any text layer at this position
      const textLayer = findTextLayerAtPosition(deps.layersRef.current, row, col)
      if (textLayer) {
        deps.pushSnapshot()
        enterEditing(textLayer.id)
        return
      }
      // Start drawing a new text box
      phase = 'drawing'
      drawStart = { row, col }
      drawEnd = { row, col }
      return
    }

    if (phase === 'editing') {
      const layer = getEditingLayer()
      if (!layer) { exitEditing(); return }
      const handle = detectHandle(row, col, layer.bounds)

      if (handle === 'outside') {
        exitEditing()
        return
      }

      const isCorner = handle === 'top-left' || handle === 'top-right' || handle === 'bottom-left' || handle === 'bottom-right'
      if (!isCorner) {
        // Inside or edge — move
        phase = 'moving'
        dragStart = { row, col }
        dragBoundsStart = { ...layer.bounds }
        return
      }

      // Corner — resize
      phase = 'resizing'
      resizeHandle = handle
      dragStart = { row, col }
      dragBoundsStart = { ...layer.bounds }
    }
  }

  function onMouseMove(row: number, col: number): void {
    if (phase === 'drawing' && drawStart) {
      drawEnd = { row, col }
      const r0 = Math.min(drawStart.row, row)
      const c0 = Math.min(drawStart.col, col)
      const r1 = Math.max(drawStart.row, row)
      const c1 = Math.max(drawStart.col, col)
      positionBoundsOverlay({ r0, c0, r1, c1 })
      return
    }

    if (phase === 'moving' && dragStart && dragBoundsStart && editingLayerId) {
      const dr = row - dragStart.row
      const dc = col - dragStart.col
      const newBounds: Rect = {
        r0: dragBoundsStart.r0 + dr,
        c0: dragBoundsStart.c0 + dc,
        r1: dragBoundsStart.r1 + dr,
        c1: dragBoundsStart.c1 + dc,
      }
      deps.updateTextLayer(editingLayerId, { bounds: newBounds })
      positionBoundsOverlay(newBounds)
      positionCursorOverlay()
      deps.rerenderGrid()
      return
    }

    if (phase === 'resizing' && dragStart && dragBoundsStart && editingLayerId && resizeHandle) {
      const dr = row - dragStart.row
      const dc = col - dragStart.col
      const newBounds = computeResizedBounds(dragBoundsStart, resizeHandle, dr, dc)
      deps.updateTextLayer(editingLayerId, { bounds: newBounds })
      positionBoundsOverlay(newBounds)
      positionCursorOverlay()
      deps.rerenderGrid()
    }
  }

  function onMouseUp(): void {
    if (phase === 'drawing' && drawStart) {
      const end = drawEnd ?? drawStart
      const bounds: Rect = {
        r0: Math.max(0, Math.min(drawStart.row, end.row)),
        c0: Math.max(0, Math.min(drawStart.col, end.col)),
        r1: Math.min(ANSI_ROWS - 1, Math.max(drawStart.row, end.row)),
        c1: Math.min(ANSI_COLS - 1, Math.max(drawStart.col, end.col)),
      }
      deps.pushSnapshot()
      deps.addTextLayer('Text', bounds, [...deps.brushRef.current.fg] as RGBColor)
      drawStart = null
      drawEnd = null
      // Find the newly created text layer and enter editing
      const layers = deps.layersRef.current
      const newLayer = layers[layers.length - 1]
      if (newLayer?.type === 'text') {
        enterEditing(newLayer.id)
      } else {
        phase = 'editing'
      }
      return
    }

    if (phase === 'moving' || phase === 'resizing') {
      phase = 'editing'
      dragStart = null
      dragBoundsStart = null
      resizeHandle = null
    }
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (phase !== 'editing') return
    if (!editingLayerId) return
    const layer = getEditingLayer()
    if (!layer) return

    // Ignore Ctrl combos (allow undo/redo passthrough)
    if (e.ctrlKey || e.metaKey) return

    if (e.key === 'Escape') {
      exitEditing()
      return
    }

    if (e.key === 'Backspace') {
      if (cursorPos > 0) {
        const newText = layer.text.slice(0, cursorPos - 1) + layer.text.slice(cursorPos)
        const colors = [...(layer.textFgColors ?? [])]
        colors.splice(cursorPos - 1, 1)
        cursorPos--
        deps.updateTextLayer(editingLayerId, { text: newText, textFgColors: colors })
        deps.rerenderGrid()
        positionCursorOverlay()
      }
      return
    }

    if (e.key === 'Delete') {
      if (cursorPos < layer.text.length) {
        const newText = layer.text.slice(0, cursorPos) + layer.text.slice(cursorPos + 1)
        const colors = [...(layer.textFgColors ?? [])]
        colors.splice(cursorPos, 1)
        deps.updateTextLayer(editingLayerId, { text: newText, textFgColors: colors })
        deps.rerenderGrid()
        positionCursorOverlay()
      }
      return
    }

    if (e.key === 'Enter') {
      const newText = layer.text.slice(0, cursorPos) + '\n' + layer.text.slice(cursorPos)
      const colors = [...(layer.textFgColors ?? [])]
      colors.splice(cursorPos, 0, [...deps.brushRef.current.fg] as RGBColor)
      cursorPos++
      deps.updateTextLayer(editingLayerId, { text: newText, textFgColors: colors })
      deps.rerenderGrid()
      positionCursorOverlay()
      return
    }

    if (e.key === 'ArrowLeft') {
      if (cursorPos > 0) cursorPos--
      positionCursorOverlay()
      return
    }

    if (e.key === 'ArrowRight') {
      if (cursorPos < layer.text.length) cursorPos++
      positionCursorOverlay()
      return
    }

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      // Simple up/down navigation
      positionCursorOverlay()
      return
    }

    // Printable character
    if (e.key.length === 1) {
      const newText = layer.text.slice(0, cursorPos) + e.key + layer.text.slice(cursorPos)
      const colors = [...(layer.textFgColors ?? [])]
      colors.splice(cursorPos, 0, [...deps.brushRef.current.fg] as RGBColor)
      cursorPos++
      deps.updateTextLayer(editingLayerId, { text: newText, textFgColors: colors })
      deps.rerenderGrid()
      positionCursorOverlay()
    }
  }

  function commitIfEditing(): void {
    if (phase === 'editing' || phase === 'moving' || phase === 'resizing') {
      exitEditing()
    }
  }

  function getPhase(): TextToolPhase {
    return phase
  }

  function refreshOverlays(): void {
    if (phase !== 'editing') return
    const layer = getEditingLayer()
    if (!layer) return
    positionBoundsOverlay(layer.bounds)
    positionCursorOverlay()
  }

  return { onMouseDown, onMouseMove, onMouseUp, onKeyDown, commitIfEditing, getPhase, refreshOverlays }
}

function computeResizedBounds(original: Rect, handle: Handle, dr: number, dc: number): Rect {
  let { r0, c0, r1, c1 } = original

  switch (handle) {
    case 'top': r0 += dr; break
    case 'bottom': r1 += dr; break
    case 'left': c0 += dc; break
    case 'right': c1 += dc; break
    case 'top-left': r0 += dr; c0 += dc; break
    case 'top-right': r0 += dr; c1 += dc; break
    case 'bottom-left': r1 += dr; c0 += dc; break
    case 'bottom-right': r1 += dr; c1 += dc; break
  }

  // Enforce minimum 1x1
  if (r1 < r0) r1 = r0
  if (c1 < c0) c1 = c0

  return { r0, c0, r1, c1 }
}
