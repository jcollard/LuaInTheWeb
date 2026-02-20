/* eslint-disable max-lines */
import { useState, useCallback, useRef, useMemo } from 'react'
import type { AnsiTerminalHandle } from '../AnsiTerminalPanel/AnsiTerminalPanel'
import type { AnsiCell, AnsiGrid, BrushMode, DrawTool, BrushSettings, BorderStyle, RGBColor, LayerState, TextAlign, UseAnsiEditorReturn, UseAnsiEditorOptions, DrawableLayer } from './types'
import { ANSI_COLS, ANSI_ROWS, DEFAULT_FG, DEFAULT_BG, DEFAULT_CELL, BORDER_PRESETS, isGroupLayer, isDrawableLayer } from './types'
import type { CellHalf, ColorTransform } from './gridUtils'
import { createEmptyGrid, isInBounds, getCellHalfFromMouse, computePixelCell, computeFloodFillCells } from './gridUtils'
import { TerminalBuffer } from './terminalBuffer'
import { cgaQuantize } from './ansExport'
import { compositeCell, compositeGrid, cloneLayerState, isDefaultCell, getGroupDescendantLayers } from './layerUtils'
import { useLayerState } from './useLayerState'
import { loadPngPixels, rgbaToAnsiGrid } from './pngImport'
import { createDrawHelpers } from './drawHelpers'
import { createSelectionHandlers, type SelectionHandlers } from './selectionTool'
import { createTextToolHandlers, type TextToolHandlers } from './textTool'

export { computePixelCell, computeLineCells } from './gridUtils'

const MAX_HISTORY = 50

export function useAnsiEditor(options?: UseAnsiEditorOptions): UseAnsiEditorReturn {
  const initialState = useMemo((): LayerState | undefined => {
    if (options?.initialLayerState) return options.initialLayerState
    if (options?.initialGrid) {
      const id = 'initial-bg'
      return {
        layers: [{ type: 'drawn' as const, id, name: 'Background', visible: true, grid: options.initialGrid }],
        activeLayerId: id,
      }
    }
    return undefined
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const layerState = useLayerState(initialState)
  // Destructure identity-stable refs/callbacks for use in dependency arrays.
  // Layer mutation functions are aliased with "raw" prefix because we wrap them
  // with undo snapshots below before exposing them as addLayer, removeLayer, etc.
  const {
    layersRef, activeLayerIdRef, applyToActiveLayer, getActiveGrid, restoreLayerState,
    addLayer: rawAddLayer, addLayerWithGrid: rawAddLayerWithGrid, removeLayer: rawRemoveLayer,
    reorderLayer: rawReorderLayer,
    toggleVisibility: rawToggleVisibility, mergeDown: rawMergeDown,
    replaceColors: rawReplaceColors,
    addTextLayer: rawAddTextLayer,
    updateTextLayer: rawUpdateTextLayer,
    wrapInGroup: rawWrapInGroup,
    removeFromGroup: rawRemoveFromGroup,
    toggleGroupCollapsed: rawToggleGroupCollapsed,
    applyMoveGrids: rawApplyMoveGrids,
    applyMoveGridsImmediate: rawApplyMoveGridsImmediate,
  } = layerState

  const grid = useMemo(() => compositeGrid(layerState.layers), [layerState.layers])

  const [brush, setBrush] = useState<BrushSettings>({
    char: '#', fg: DEFAULT_FG, bg: DEFAULT_BG, mode: 'brush', tool: 'pencil',
    borderStyle: BORDER_PRESETS[0].style,
  })
  const [isDirty, setIsDirty] = useState(false)
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const undoStackRef = useRef<LayerState[]>([]), redoStackRef = useRef<LayerState[]>([])
  const terminalBufferRef = useRef(new TerminalBuffer())
  const brushRef = useRef(brush); brushRef.current = brush
  const paintingRef = useRef(false)
  const lastCellRef = useRef<{ row: number; col: number; isTopHalf?: boolean } | null>(null)
  const cursorRef = useRef<HTMLDivElement | null>(null), dimensionRef = useRef<HTMLDivElement | null>(null)
  const lineStartRef = useRef<CellHalf | null>(null)
  const previewCellsRef = useRef<Map<string, AnsiCell>>(new Map())
  const cleanupRef = useRef<(() => void) | null>(null)
  const selectionRef = useRef<HTMLDivElement | null>(null), textBoundsRef = useRef<HTMLDivElement | null>(null)
  const textCursorRef = useRef<HTMLDivElement | null>(null)
  const commitPendingSelectionRef = useRef<(() => void) | null>(null), commitPendingTextRef = useRef<(() => void) | null>(null)
  const containerRef = useRef<HTMLElement | null>(null), textToolRef = useRef<TextToolHandlers | null>(null), selHandlersRef = useRef<SelectionHandlers | null>(null)
  const updateTextBoundsDisplayRef = useRef<(() => void) | null>(null)
  const moveStartRef = useRef<CellHalf | null>(null)
  const moveCapturedRef = useRef<Map<string, Map<string, AnsiCell>>>(new Map())
  const moveOrigGridsRef = useRef<Map<string, AnsiGrid>>(new Map())
  const moveRafRef = useRef<number | null>(null)
  const moveLatestCellRef = useRef<CellHalf | null>(null)
  const moveBlankGridsRef = useRef<Map<string, AnsiGrid>>(new Map())
  const [cgaPreview, setCgaPreviewRaw] = useState(false)
  const [isMoveDragging, setIsMoveDragging] = useState(false)
  const colorTransformRef = useRef<ColorTransform | undefined>(undefined); colorTransformRef.current = cgaPreview ? cgaQuantize : undefined

  const pushSnapshot = useCallback(() => {
    const stack = undoStackRef.current
    stack.push(cloneLayerState({ layers: layersRef.current, activeLayerId: activeLayerIdRef.current }))
    if (stack.length > MAX_HISTORY) stack.shift()
    redoStackRef.current = []
    setCanUndo(true)
    setCanRedo(false)
  }, [layersRef, activeLayerIdRef])

  const restoreSnapshot = useCallback((from: LayerState[], to: LayerState[]) => {
    if (from.length === 0) return
    to.push(cloneLayerState({ layers: layersRef.current, activeLayerId: activeLayerIdRef.current }))
    const snapshot = from.pop()!
    restoreLayerState(snapshot)
    setIsDirty(true)
    setCanUndo(undoStackRef.current.length > 0); setCanRedo(redoStackRef.current.length > 0)
    terminalBufferRef.current.flush(compositeGrid(snapshot.layers), colorTransformRef.current)
  }, [layersRef, activeLayerIdRef, restoreLayerState])

  const undo = useCallback(() => restoreSnapshot(undoStackRef.current, redoStackRef.current), [restoreSnapshot])
  const redo = useCallback(() => restoreSnapshot(redoStackRef.current, undoStackRef.current), [restoreSnapshot])
  const setBrushFg = useCallback((color: RGBColor) => setBrush(p => ({ ...p, fg: color })), [])
  const setBrushBg = useCallback((color: RGBColor) => setBrush(p => ({ ...p, bg: color })), [])
  const setBrushChar = useCallback((c: string) => { if (c.length === 1) setBrush(p => ({ ...p, char: c })) }, [])
  const setBrushMode = useCallback((mode: BrushMode) => setBrush(p => {
    if (p.tool === 'border' && mode !== 'brush') return p
    return { ...p, mode }
  }), [])
  const setTool = useCallback((tool: DrawTool) => {
    commitPendingSelectionRef.current?.(); commitPendingTextRef.current?.()
    setBrush(p => tool === 'border' ? { ...p, tool, mode: 'brush' } : { ...p, tool })
  }, [])
  const setBorderStyle = useCallback((style: BorderStyle) => setBrush(p => ({ ...p, borderStyle: style })), [])

  const applyCell = useCallback((row: number, col: number, cell: AnsiCell) => {
    applyToActiveLayer(row, col, cell); setIsDirty(true)
    terminalBufferRef.current.writeCell(row, col, compositeCell(layersRef.current, row, col), colorTransformRef.current)
  }, [applyToActiveLayer, layersRef])

  const paintPixel = useCallback((row: number, col: number, isTopHalf: boolean) => {
    if (!isInBounds(row, col)) return
    applyCell(row, col, computePixelCell(getActiveGrid()[row][col], brushRef.current.fg, isTopHalf))
  }, [applyCell, getActiveGrid])

  const paintCell = useCallback((row: number, col: number) => {
    if (!isInBounds(row, col)) return
    const { char, fg, bg } = brushRef.current
    applyCell(row, col, { char, fg: [...fg] as RGBColor, bg: [...bg] as RGBColor })
  }, [applyCell])

  const clearGrid = useCallback(() => {
    pushSnapshot()
    const emptyGrid = createEmptyGrid()
    const id = 'clear-bg-' + Date.now()
    restoreLayerState({ layers: [{ type: 'drawn', id, name: 'Background', visible: true, grid: emptyGrid }], activeLayerId: id })
    setIsDirty(false)
    terminalBufferRef.current.flush(emptyGrid, colorTransformRef.current)
  }, [pushSnapshot, restoreLayerState])

  const withLayerUndo = useCallback((action: () => void, needsRerender = true) => {
    pushSnapshot()
    action()
    if (needsRerender) {
      setIsDirty(true)
      setTimeout(() => {
        terminalBufferRef.current.flush(compositeGrid(layersRef.current), colorTransformRef.current)
      }, 0)
    }
  }, [pushSnapshot, layersRef])

  const addLayerWithUndo = useCallback(() => withLayerUndo(rawAddLayer, false), [withLayerUndo, rawAddLayer])
  const removeLayerWithUndo = useCallback((id: string) => withLayerUndo(() => rawRemoveLayer(id)), [withLayerUndo, rawRemoveLayer])
  const reorderLayerWithUndo = useCallback(
    (id: string, newIndex: number, targetGroupId?: string | null) => withLayerUndo(() => rawReorderLayer(id, newIndex, targetGroupId)),
    [withLayerUndo, rawReorderLayer],
  )
  const toggleVisibilityWithUndo = useCallback((id: string) => withLayerUndo(() => rawToggleVisibility(id)), [withLayerUndo, rawToggleVisibility])
  const mergeDownWithUndo = useCallback((id: string) => withLayerUndo(() => rawMergeDown(id)), [withLayerUndo, rawMergeDown])
  const wrapInGroupWithUndo = useCallback((id: string) => withLayerUndo(() => rawWrapInGroup(id), false), [withLayerUndo, rawWrapInGroup])
  const removeFromGroupWithUndo = useCallback((id: string) => withLayerUndo(() => rawRemoveFromGroup(id), false), [withLayerUndo, rawRemoveFromGroup])
  const toggleGroupCollapsedNoUndo = useCallback((id: string) => rawToggleGroupCollapsed(id), [rawToggleGroupCollapsed])

  const importPngAsLayer = useCallback(async (file: File) => {
    const px = await loadPngPixels(file)
    const name = file.name.replace(/\.\w+$/, '')
    withLayerUndo(() => rawAddLayerWithGrid(name, rgbaToAnsiGrid(px.rgba, px.width, px.height)))
  }, [withLayerUndo, rawAddLayerWithGrid])

  const simplifyColors = useCallback(
    (mapping: Map<string, RGBColor>, scope: 'current' | 'layer') => withLayerUndo(() => rawReplaceColors(mapping, scope)),
    [withLayerUndo, rawReplaceColors],
  )

  const attachMouseListeners = useCallback((container: HTMLElement) => {
    const draw = createDrawHelpers({
      container, cursorRef, dimensionRef, terminalBuffer: terminalBufferRef.current, brushRef,
      layersRef, activeLayerIdRef, previewCellsRef, lineStartRef,
      colorTransformRef, getActiveGrid, applyCell, paintPixel, paintCell,
    })

    const sel = createSelectionHandlers({
      container, selectionRef, commitPendingRef: commitPendingSelectionRef,
      restorePreview: draw.restorePreview, writePreviewCells: draw.writePreviewCells,
      commitCells: draw.commitCells, pushSnapshot, getActiveGrid, hideDimension: draw.hideDimension,
    })

    selHandlersRef.current = sel
    containerRef.current = container

    function updateTextBoundsDisplay(): void {
      if (textToolRef.current && textToolRef.current.getPhase() !== 'idle') return
      const activeLayer = layersRef.current.find(l => l.id === activeLayerIdRef.current)
      if (activeLayer?.type === 'text') {
        const el = textBoundsRef.current
        if (!el) return
        const { bounds } = activeLayer
        const rect = container.getBoundingClientRect()
        const cellW = rect.width / ANSI_COLS
        const cellH = rect.height / ANSI_ROWS
        el.style.display = 'block'
        el.style.left = `${rect.left + bounds.c0 * cellW}px`
        el.style.top = `${rect.top + bounds.r0 * cellH}px`
        el.style.width = `${(bounds.c1 - bounds.c0 + 1) * cellW}px`
        el.style.height = `${(bounds.r1 - bounds.r0 + 1) * cellH}px`
      } else if (textBoundsRef.current) {
        textBoundsRef.current.style.display = 'none'
      }
    }
    updateTextBoundsDisplayRef.current = updateTextBoundsDisplay

    const textTool = createTextToolHandlers({
      layersRef, activeLayerIdRef, brushRef,
      addTextLayer: rawAddTextLayer,
      updateTextLayer: rawUpdateTextLayer,
      pushSnapshot,
      rerenderGrid: () => {
        terminalBufferRef.current.flush(compositeGrid(layersRef.current), colorTransformRef.current)
      },
      textBoundsRef, textCursorRef, containerRef,
      onExitEditing: updateTextBoundsDisplay,
    })
    textToolRef.current = textTool
    commitPendingTextRef.current = () => textTool.commitIfEditing()

    function onKeyDown(e: KeyboardEvent): void {
      if (brushRef.current.tool === 'text') textTool.onKeyDown(e)
      else if (brushRef.current.tool === 'select') sel.onKeyDown(e)
      else if (brushRef.current.tool === 'move' && e.key === 'Escape' && moveStartRef.current) {
        if (moveRafRef.current !== null) {
          cancelAnimationFrame(moveRafRef.current)
          moveRafRef.current = null
        }
        moveStartRef.current = null
        moveCapturedRef.current = new Map()
        moveOrigGridsRef.current = new Map()
        moveBlankGridsRef.current = new Map()
        moveLatestCellRef.current = null
        setIsMoveDragging(false)
        undo()
      }
    }
    document.addEventListener('keydown', onKeyDown)

    function pixelColor(c: AnsiCell, isTopHalf: boolean): RGBColor {
      if (c.char === ' ') return c.bg
      return isTopHalf ? c.fg : c.bg
    }

    function sampleCell(e: MouseEvent, cell: CellHalf): boolean {
      const s = compositeCell(layersRef.current, cell.row, cell.col)
      const isRight = e.button === 2
      if (brushRef.current.tool === 'eyedropper') {
        const c = pixelColor(s, cell.isTopHalf)
        setBrush(p => isRight ? { ...p, bg: [...c] as RGBColor } : { ...p, fg: [...c] as RGBColor })
        return true
      }
      if (e.ctrlKey) {
        setBrush(p => isRight ? { ...p, bg: [...s.bg] as RGBColor } : { ...p, fg: [...s.fg] as RGBColor })
        return true
      }
      if (isRight) { setBrush(p => ({ ...p, char: s.char })); return true }
      return false
    }

    function onMouseDown(e: MouseEvent): void {
      e.preventDefault()
      const cell = getCellHalfFromMouse(e, container)
      if (cell && sampleCell(e, cell)) {
        draw.positionCursor(cell.row, cell.col, draw.cursorHalf(cell))
        return
      }
      switch (brushRef.current.tool) {
        case 'pencil': {
          pushSnapshot()
          paintingRef.current = true
          lastCellRef.current = null
          if (!cell) return
          lastCellRef.current = cell
          draw.paintAt(cell.row, cell.col, cell.isTopHalf)
          break
        }
        case 'line': {
          if (!cell) return
          pushSnapshot()
          lineStartRef.current = cell
          previewCellsRef.current.clear()
          draw.renderLinePreview(cell)
          break
        }
        case 'rect-outline':
        case 'rect-filled':
        case 'oval-outline':
        case 'oval-filled':
        case 'border': {
          if (!cell) return
          pushSnapshot()
          lineStartRef.current = cell
          previewCellsRef.current.clear()
          draw.renderShapePreview(cell)
          break
        }
        case 'flood-fill': {
          if (!cell) return
          const fills = computeFloodFillCells(
            cell.row, cell.col, brushRef.current, getActiveGrid(), cell.isTopHalf,
          )
          if (fills.size === 0) return
          pushSnapshot()
          draw.commitCells(fills)
          break
        }
        case 'select': {
          if (!cell) return
          sel.onMouseDown(cell.row, cell.col)
          break
        }
        case 'text': {
          if (!cell) return
          textTool.onMouseDown(cell.row, cell.col)
          break
        }
        case 'move': {
          if (!cell) return
          pushSnapshot()
          setIsMoveDragging(true)
          moveStartRef.current = cell
          moveCapturedRef.current = new Map()
          moveOrigGridsRef.current = new Map()
          moveBlankGridsRef.current = new Map()
          moveLatestCellRef.current = null
          const activeId = activeLayerIdRef.current
          const activeLayer = layersRef.current.find(l => l.id === activeId)
          const targets: DrawableLayer[] = activeLayer && isGroupLayer(activeLayer)
            ? getGroupDescendantLayers(activeId, layersRef.current)
            : layersRef.current.filter((l): l is DrawableLayer => isDrawableLayer(l) && l.id === activeId)
          for (const target of targets) {
            const captured = new Map<string, AnsiCell>()
            for (let r = 0; r < ANSI_ROWS; r++) {
              for (let c = 0; c < ANSI_COLS; c++) {
                const cell = target.grid[r][c]
                if (!isDefaultCell(cell)) captured.set(`${r},${c}`, cell)
              }
            }
            moveCapturedRef.current.set(target.id, captured)
            moveOrigGridsRef.current.set(target.id, target.grid.map(row => row.map(c => ({ ...c, fg: [...c.fg] as RGBColor, bg: [...c.bg] as RGBColor }))))
            moveBlankGridsRef.current.set(target.id, createEmptyGrid())
          }
          break
        }
      }
      if (cell) draw.positionCursor(cell.row, cell.col, draw.cursorHalf(cell))
      document.addEventListener('mouseup', onDocumentMouseUp)
    }

    function onMouseMove(e: MouseEvent): void {
      const cell = getCellHalfFromMouse(e, container)
      if (cell) draw.positionCursor(cell.row, cell.col, draw.cursorHalf(cell))
      else draw.hideCursor()
      if (!cell) return
      switch (brushRef.current.tool) {
        case 'pencil': {
          if (!paintingRef.current) return
          const last = lastCellRef.current
          const current = brushRef.current.mode !== 'brush' ? cell : { row: cell.row, col: cell.col }
          if (last && draw.isSameCell(last, current)) return
          lastCellRef.current = current
          draw.paintAt(cell.row, cell.col, cell.isTopHalf)
          break
        }
        case 'line':
          if (lineStartRef.current) draw.renderLinePreview(cell)
          break
        case 'rect-outline':
        case 'rect-filled':
        case 'oval-outline':
        case 'oval-filled':
        case 'border':
          if (lineStartRef.current) draw.renderShapePreview(cell)
          break
        case 'select':
          sel.onMouseMove(cell.row, cell.col)
          break
        case 'text':
          textTool.onMouseMove(cell.row, cell.col)
          break
        case 'move': {
          if (!moveStartRef.current) break
          moveLatestCellRef.current = cell
          if (moveRafRef.current === null) {
            moveRafRef.current = requestAnimationFrame(() => {
              moveRafRef.current = null
              const target = moveLatestCellRef.current
              if (!target || !moveStartRef.current) return
              const dr = target.row - moveStartRef.current.row
              const dc = target.col - moveStartRef.current.col
              const updatedGrids = new Map<string, AnsiGrid>()
              for (const [layerId, captured] of moveCapturedRef.current) {
                const grid = moveBlankGridsRef.current.get(layerId)
                if (!grid) continue
                // Reset grid to default cells
                for (let r = 0; r < ANSI_ROWS; r++)
                  for (let c = 0; c < ANSI_COLS; c++)
                    grid[r][c] = DEFAULT_CELL
                // Place shifted cells (captured cells are immutable snapshots)
                for (const [key, cellVal] of captured) {
                  const [rStr, cStr] = key.split(',')
                  const nr = parseInt(rStr, 10) + dr
                  const nc = parseInt(cStr, 10) + dc
                  if (nr >= 0 && nr < ANSI_ROWS && nc >= 0 && nc < ANSI_COLS) {
                    grid[nr][nc] = cellVal
                  }
                }
                updatedGrids.set(layerId, grid)
              }
              rawApplyMoveGridsImmediate(updatedGrids)
              terminalBufferRef.current.flush(compositeGrid(layersRef.current), colorTransformRef.current)
            })
          }
          break
        }
      }
    }

    function onDocumentMouseUp(e: MouseEvent): void {
      document.removeEventListener('mouseup', onDocumentMouseUp)
      switch (brushRef.current.tool) {
        case 'pencil':
          paintingRef.current = false
          lastCellRef.current = null
          break
        case 'line': {
          if (!lineStartRef.current) break
          const cell = getCellHalfFromMouse(e, container)
          if (cell) {
            draw.commitLine(cell)
          } else {
            draw.restorePreview()
            lineStartRef.current = null
          }
          break
        }
        case 'rect-outline':
        case 'rect-filled':
        case 'oval-outline':
        case 'oval-filled':
        case 'border': {
          if (!lineStartRef.current) break
          const cell = getCellHalfFromMouse(e, container)
          if (cell) {
            draw.commitShape(cell)
          } else {
            draw.restorePreview()
            lineStartRef.current = null
            draw.hideDimension()
          }
          break
        }
        case 'select':
          sel.onMouseUp()
          break
        case 'text':
          textTool.onMouseUp()
          break
        case 'move': {
          if (moveRafRef.current !== null) {
            cancelAnimationFrame(moveRafRef.current)
            moveRafRef.current = null
          }
          if (!moveStartRef.current) break
          const endCell = getCellHalfFromMouse(e, container)
          const dr = endCell ? endCell.row - moveStartRef.current.row : 0
          const dc = endCell ? endCell.col - moveStartRef.current.col : 0
          if (dr === 0 && dc === 0) {
            // No movement — pop undo snapshot
            undo()
          } else {
            // Apply final position and sync to React state
            const finalGrids = new Map<string, AnsiGrid>()
            for (const [layerId, captured] of moveCapturedRef.current) {
              const grid = moveBlankGridsRef.current.get(layerId)
              if (!grid) continue
              for (let r = 0; r < ANSI_ROWS; r++)
                for (let c = 0; c < ANSI_COLS; c++)
                  grid[r][c] = DEFAULT_CELL
              for (const [key, cellVal] of captured) {
                const [rStr, cStr] = key.split(',')
                const nr = parseInt(rStr, 10) + dr
                const nc = parseInt(cStr, 10) + dc
                if (nr >= 0 && nr < ANSI_ROWS && nc >= 0 && nc < ANSI_COLS) {
                  grid[nr][nc] = cellVal
                }
              }
              finalGrids.set(layerId, grid)
            }
            rawApplyMoveGrids(finalGrids)
            // Update text layer bounds for any moved text layers
            for (const [layerId] of moveCapturedRef.current) {
              const layer = layersRef.current.find(l => l.id === layerId)
              if (layer?.type === 'text') {
                rawUpdateTextLayer(layerId, {
                  bounds: {
                    r0: layer.bounds.r0 + dr,
                    c0: layer.bounds.c0 + dc,
                    r1: layer.bounds.r1 + dr,
                    c1: layer.bounds.c1 + dc,
                  },
                })
              }
            }
            setIsDirty(true)
          }
          moveStartRef.current = null
          moveCapturedRef.current = new Map()
          moveOrigGridsRef.current = new Map()
          moveBlankGridsRef.current = new Map()
          moveLatestCellRef.current = null
          setIsMoveDragging(false)
          break
        }
      }
    }

    function onMouseLeave(): void { draw.hideCursor() }
    function onContextMenu(e: MouseEvent): void { e.preventDefault() }

    container.addEventListener('mousedown', onMouseDown)
    container.addEventListener('mousemove', onMouseMove)
    container.addEventListener('mouseleave', onMouseLeave)
    container.addEventListener('contextmenu', onContextMenu)
    return () => {
      container.removeEventListener('mousedown', onMouseDown)
      container.removeEventListener('mousemove', onMouseMove)
      container.removeEventListener('mouseleave', onMouseLeave)
      container.removeEventListener('contextmenu', onContextMenu)
      document.removeEventListener('mouseup', onDocumentMouseUp)
      document.removeEventListener('keydown', onKeyDown)
      textTool.commitIfEditing()
    }
  }, [paintCell, paintPixel, applyCell, pushSnapshot, layersRef, activeLayerIdRef, getActiveGrid, rawAddTextLayer, rawUpdateTextLayer, undo, rawApplyMoveGrids, rawApplyMoveGridsImmediate])

  const setActiveLayerWithBounds = useCallback((id: string) => {
    commitPendingTextRef.current?.()
    const prevLayer = layersRef.current.find(l => l.id === activeLayerIdRef.current)
    layerState.setActiveLayer(id)
    const layer = layersRef.current.find(l => l.id === id)
    if (layer && isGroupLayer(layer)) {
      setBrush(p => p.tool === 'move' ? p : ({ ...p, tool: 'move' }))
    } else if (layer?.type === 'text') {
      setBrush(p => p.tool === 'text' ? p : ({ ...p, tool: 'text' }))
    } else if (brushRef.current.tool === 'move' && prevLayer && isGroupLayer(prevLayer)) {
      setBrush(p => ({ ...p, tool: 'pencil' }))
    } else if (brushRef.current.tool === 'text') {
      setBrush(p => ({ ...p, tool: 'pencil' }))
    }
    updateTextBoundsDisplayRef.current?.()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layerState.setActiveLayer, layersRef, activeLayerIdRef])

  const setTextAlign = useCallback((align: TextAlign) => {
    const activeId = activeLayerIdRef.current
    const active = layersRef.current.find(l => l.id === activeId)
    if (!active || active.type !== 'text') return
    pushSnapshot()
    rawUpdateTextLayer(activeId, { textAlign: align })
    setIsDirty(true)
    terminalBufferRef.current.flush(compositeGrid(layersRef.current), colorTransformRef.current)
    textToolRef.current?.refreshOverlays()
  }, [pushSnapshot, rawUpdateTextLayer, layersRef, activeLayerIdRef])

  const setCgaPreview = useCallback((on: boolean) => {
    setCgaPreviewRaw(on)
    colorTransformRef.current = on ? cgaQuantize : undefined
    terminalBufferRef.current.invalidate()
    terminalBufferRef.current.flush(compositeGrid(layersRef.current), colorTransformRef.current)
  }, [layersRef])

  const flipSelectionHorizontal = useCallback(() => {
    selHandlersRef.current?.flipHorizontal()
  }, [])

  const flipSelectionVertical = useCallback(() => {
    selHandlersRef.current?.flipVertical()
  }, [])

  const markClean = useCallback(() => setIsDirty(false), [])
  const openSaveDialog = useCallback(() => setIsSaveDialogOpen(true), []), closeSaveDialog = useCallback(() => setIsSaveDialogOpen(false), [])

  const onTerminalReady = useCallback((handle: AnsiTerminalHandle | null) => {
    cleanupRef.current?.()
    cleanupRef.current = null
    if (handle) {
      terminalBufferRef.current.attach(handle)
      terminalBufferRef.current.flush(compositeGrid(layersRef.current), colorTransformRef.current)
      cleanupRef.current = attachMouseListeners(handle.container)
      updateTextBoundsDisplayRef.current?.()
    } else {
      terminalBufferRef.current.detach()
    }
  }, [attachMouseListeners, layersRef])

  const activeLayer = layerState.layers.find(l => l.id === layerState.activeLayerId)
  const activeLayerIsGroup = activeLayer ? isGroupLayer(activeLayer) : false

  return {
    grid, brush, setBrushFg, setBrushBg, setBrushChar, setBrushMode, setTool, setBorderStyle, clearGrid,
    isDirty, markClean, onTerminalReady, cursorRef, dimensionRef, selectionRef, textBoundsRef, textCursorRef,
    isSaveDialogOpen, openSaveDialog, closeSaveDialog, undo, redo, canUndo, canRedo,
    layers: layerState.layers, activeLayerId: layerState.activeLayerId,
    addLayer: addLayerWithUndo, removeLayer: removeLayerWithUndo,
    renameLayer: layerState.renameLayer, setActiveLayer: setActiveLayerWithBounds,
    reorderLayer: reorderLayerWithUndo,
    toggleVisibility: toggleVisibilityWithUndo, mergeDown: mergeDownWithUndo,
    wrapInGroup: wrapInGroupWithUndo, removeFromGroup: removeFromGroupWithUndo,
    toggleGroupCollapsed: toggleGroupCollapsedNoUndo,
    importPngAsLayer, simplifyColors, setTextAlign, flipSelectionHorizontal, flipSelectionVertical,
    activeLayerIsGroup, isMoveDragging,
    cgaPreview, setCgaPreview,
  }
}
