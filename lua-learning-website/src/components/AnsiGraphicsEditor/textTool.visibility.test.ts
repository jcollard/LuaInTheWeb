import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTextToolHandlers } from './textTool'
import type { TextToolDeps } from './textTool'
import type { DrawnLayer, GroupLayer, Rect, RGBColor, TextLayer, AnsiGrid } from './types'
import { ANSI_COLS, ANSI_ROWS, DEFAULT_BG, DEFAULT_FG } from './types'

function makeFullGrid(): AnsiGrid {
  return Array.from({ length: ANSI_ROWS }, () =>
    Array.from({ length: ANSI_COLS }, () => ({ char: ' ', fg: [...DEFAULT_FG] as RGBColor, bg: [...DEFAULT_BG] as RGBColor })),
  )
}

function makeTextLayerWithGrid(id: string, bounds: Rect): TextLayer {
  return {
    type: 'text',
    id,
    name: id,
    visible: true,
    text: 'Hello',
    bounds,
    textFg: [255, 255, 255] as RGBColor,
    grid: makeFullGrid(),
  }
}

function makeDrawnLayer(id: string): DrawnLayer {
  const grid = makeFullGrid()
  return {
    type: 'drawn',
    id,
    name: id,
    visible: true,
    grid,
    frames: [grid],
    currentFrameIndex: 0,
    frameDurationMs: 200,
  }
}

function makeGroupLayer(id: string, visible: boolean): GroupLayer {
  return { type: 'group', id, name: id, visible, collapsed: false }
}

describe('text tool visibility and occlusion', () => {
  let deps: TextToolDeps
  const red: RGBColor = [255, 0, 0]

  beforeEach(() => {
    deps = {
      layersRef: { current: [] },
      activeLayerIdRef: { current: '' },
      brushRef: { current: { fg: [255, 255, 255] as RGBColor } },
      addTextLayer: vi.fn(),
      updateTextLayer: vi.fn(),
      pushSnapshot: vi.fn(),
      rerenderGrid: vi.fn(),
      textBoundsRef: { current: document.createElement('div') },
      textCursorRef: { current: document.createElement('div') },
      containerRef: { current: document.createElement('div') },
      projectColsRef: { current: 80 },
      projectRowsRef: { current: 25 },
    }
  })

  it('does not select a hidden text layer (visible=false)', () => {
    const text = makeTextLayerWithGrid('txt', { r0: 2, c0: 5, r1: 6, c1: 20 })
    text.visible = false
    deps.layersRef.current = [text]
    deps.activeLayerIdRef.current = ''
    const handlers = createTextToolHandlers(deps)
    handlers.onMouseDown(4, 10)
    expect(handlers.getPhase()).toBe('drawing')
  })

  it('does not select a text layer inside a hidden group', () => {
    const group = makeGroupLayer('g1', false)
    const text = makeTextLayerWithGrid('txt', { r0: 2, c0: 5, r1: 6, c1: 20 })
    text.parentId = 'g1'
    deps.layersRef.current = [group, text]
    deps.activeLayerIdRef.current = ''
    const handlers = createTextToolHandlers(deps)
    handlers.onMouseDown(4, 10)
    expect(handlers.getPhase()).toBe('drawing')
  })

  it('does not select a text layer covered by an opaque layer above', () => {
    const text = makeTextLayerWithGrid('txt', { r0: 2, c0: 5, r1: 6, c1: 20 })
    const cover = makeDrawnLayer('cover')
    cover.grid[4][10] = { char: '#', fg: red, bg: [...DEFAULT_BG] as RGBColor }
    deps.layersRef.current = [text, cover]
    deps.activeLayerIdRef.current = ''
    const handlers = createTextToolHandlers(deps)
    handlers.onMouseDown(4, 10)
    expect(handlers.getPhase()).toBe('drawing')
  })

  it('does not enter editing on active hidden text layer', () => {
    const text = makeTextLayerWithGrid('txt', { r0: 2, c0: 5, r1: 6, c1: 20 })
    text.visible = false
    deps.layersRef.current = [text]
    deps.activeLayerIdRef.current = 'txt'
    const handlers = createTextToolHandlers(deps)
    handlers.onMouseDown(4, 10)
    expect(handlers.getPhase()).toBe('drawing')
  })

  it('does not enter editing on active text layer when covered', () => {
    const text = makeTextLayerWithGrid('txt', { r0: 2, c0: 5, r1: 6, c1: 20 })
    const cover = makeDrawnLayer('cover')
    cover.grid[4][10] = { char: '#', fg: red, bg: [...DEFAULT_BG] as RGBColor }
    deps.layersRef.current = [text, cover]
    deps.activeLayerIdRef.current = 'txt'
    const handlers = createTextToolHandlers(deps)
    handlers.onMouseDown(4, 10)
    expect(handlers.getPhase()).toBe('drawing')
  })

  it('still selects a visible uncovered text layer', () => {
    const text = makeTextLayerWithGrid('txt', { r0: 2, c0: 5, r1: 6, c1: 20 })
    deps.layersRef.current = [text]
    deps.activeLayerIdRef.current = ''
    const handlers = createTextToolHandlers(deps)
    handlers.onMouseDown(4, 10)
    expect(handlers.getPhase()).toBe('editing')
  })
})
