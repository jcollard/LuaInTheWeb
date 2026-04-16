/**
 * Regression tests: after loading a file with non-default dimensions, drawing
 * and adding layers should honor the loaded project dims — not silently
 * snap back to 80×25.
 */
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAnsiEditor } from './useAnsiEditor'
import { DEFAULT_CELL, DEFAULT_FRAME_DURATION_MS } from './types'
import type { AnsiCell, AnsiGrid, DrawnLayer, LayerState, RGBColor } from './types'

function makeGrid(cols: number, rows: number): AnsiGrid {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      char: DEFAULT_CELL.char,
      fg: [...DEFAULT_CELL.fg] as RGBColor,
      bg: [...DEFAULT_CELL.bg] as RGBColor,
    } as AnsiCell))
  )
}

function makeDrawnLayer(id: string, cols: number, rows: number): DrawnLayer {
  const grid = makeGrid(cols, rows)
  return {
    type: 'drawn', id, name: id, visible: true,
    grid, frames: [grid], currentFrameIndex: 0,
    frameDurationMs: DEFAULT_FRAME_DURATION_MS,
  }
}

function wideProject(cols = 120, rows = 40): LayerState {
  return {
    layers: [makeDrawnLayer('bg', cols, rows)],
    activeLayerId: 'bg',
    cols, rows,
  }
}

/** Mock the xterm container at the given pixel size so getCellHalfFromMouse math works. */
function createMockContainer(pxWidth: number, pxHeight: number): HTMLDivElement {
  const container = document.createElement('div')
  container.getBoundingClientRect = () => ({
    left: 0, top: 0, right: pxWidth, bottom: pxHeight,
    width: pxWidth, height: pxHeight, x: 0, y: 0, toJSON: () => ({}),
  } as DOMRect)
  return container
}

/** Emit a mousedown at the center of the given cell, given the container's size and project dims. */
function clickCell(container: HTMLDivElement, col: number, row: number, cols: number, rows: number): MouseEvent {
  const rect = container.getBoundingClientRect()
  const cellW = rect.width / cols
  const cellH = rect.height / rows
  return new MouseEvent('mousedown', {
    clientX: Math.floor(col * cellW + cellW / 2),
    clientY: Math.floor(row * cellH + cellH / 2),
    bubbles: true,
  })
}

describe('useAnsiEditor — loading a project with non-default dimensions', () => {
  it('exposes the loaded cols/rows and a grid at those dims', () => {
    const { result } = renderHook(() => useAnsiEditor({ initialLayerState: wideProject(120, 40) }))
    expect(result.current.cols).toBe(120)
    expect(result.current.rows).toBe(40)
    expect(result.current.grid.length).toBe(40)
    expect(result.current.grid[0].length).toBe(120)
  })

  it('pencil draws at a cell beyond the legacy 80×25 region after load', () => {
    const { result } = renderHook(() => useAnsiEditor({ initialLayerState: wideProject(120, 40) }))
    // Container sized so each cell is 10px × 20px.
    const container = createMockContainer(120 * 10, 40 * 20)
    const handle = { write: vi.fn(), container, dispose: vi.fn(), setCrt: vi.fn() }
    act(() => result.current.onTerminalReady(handle))
    act(() => result.current.setTool('pencil'))

    // Click at cell (col=100, row=35) — both coordinates outside 80×25.
    act(() => { container.dispatchEvent(clickCell(container, 100, 35, 120, 40)) })
    act(() => { document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })) })

    const active = result.current.layers[0] as DrawnLayer
    // The cell the user clicked on must exist and contain the brush.
    expect(active.grid.length).toBe(40)
    expect(active.grid[0].length).toBe(120)
    expect(active.grid[35][100].char).toBe('#')
  })

  it('adding a new drawn layer uses project dims, not 80×25', () => {
    const { result } = renderHook(() => useAnsiEditor({ initialLayerState: wideProject(120, 40) }))
    act(() => result.current.addLayer())
    const added = result.current.layers.find(l => l.id !== 'bg')
    expect(added).toBeDefined()
    if (added?.type === 'drawn') {
      expect(added.grid.length).toBe(40)
      expect(added.grid[0].length).toBe(120)
    } else {
      throw new Error('expected a drawn layer')
    }
  })

  it('clearGrid on a loaded 120×40 project produces a 120×40 empty grid', () => {
    const { result } = renderHook(() => useAnsiEditor({ initialLayerState: wideProject(120, 40) }))
    const handle = { write: vi.fn(), container: document.createElement('div'), dispose: vi.fn(), setCrt: vi.fn() }
    act(() => result.current.onTerminalReady(handle))
    act(() => result.current.clearGrid())
    expect(result.current.cols).toBe(120)
    expect(result.current.rows).toBe(40)
    expect(result.current.grid.length).toBe(40)
    expect(result.current.grid[0].length).toBe(120)
  })

  it('drawing on a NEW layer added after load works at the project dims', () => {
    const { result } = renderHook(() => useAnsiEditor({ initialLayerState: wideProject(120, 40) }))
    const container = createMockContainer(120 * 10, 40 * 20)
    const handle = { write: vi.fn(), container, dispose: vi.fn(), setCrt: vi.fn() }
    act(() => result.current.onTerminalReady(handle))

    // Add a new layer (which becomes active) and draw on it at (100, 35).
    act(() => result.current.addLayer())
    act(() => result.current.setTool('pencil'))
    act(() => { container.dispatchEvent(clickCell(container, 100, 35, 120, 40)) })
    act(() => { document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })) })

    // The new (active) layer must contain the stroke at the clicked cell.
    const active = result.current.layers.find(l => l.id === result.current.activeLayerId)
    if (active?.type !== 'drawn') throw new Error('expected a drawn active layer')
    expect(active.grid.length).toBe(40)
    expect(active.grid[0].length).toBe(120)
    expect(active.grid[35][100].char).toBe('#')
  })

  it('adding a frame to the active drawn layer uses project dims', () => {
    const { result } = renderHook(() => useAnsiEditor({ initialLayerState: wideProject(120, 40) }))
    act(() => result.current.addFrame())
    const active = result.current.layers[0] as DrawnLayer
    expect(active.frames.length).toBe(2)
    expect(active.frames[1].length).toBe(40)
    expect(active.frames[1][0].length).toBe(120)
  })
})
