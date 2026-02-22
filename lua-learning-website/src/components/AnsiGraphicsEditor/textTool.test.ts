import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTextToolHandlers, detectHandle } from './textTool'
import type { TextToolDeps, TextToolHandlers } from './textTool'
import type { Rect, RGBColor, TextLayer } from './types'

function makeTextLayer(overrides?: Partial<TextLayer>): TextLayer {
  return {
    type: 'text',
    id: 'text-1',
    name: 'Text',
    visible: true,
    text: '',
    bounds: { r0: 2, c0: 5, r1: 6, c1: 20 },
    textFg: [255, 255, 255],
    grid: [],
    ...overrides,
  }
}

describe('detectHandle', () => {
  const bounds: Rect = { r0: 2, c0: 5, r1: 6, c1: 20 }

  it('returns top-left for corner', () => {
    expect(detectHandle(2, 5, bounds)).toBe('top-left')
  })

  it('returns top-right for corner', () => {
    expect(detectHandle(2, 20, bounds)).toBe('top-right')
  })

  it('returns bottom-left for corner', () => {
    expect(detectHandle(6, 5, bounds)).toBe('bottom-left')
  })

  it('returns bottom-right for corner', () => {
    expect(detectHandle(6, 20, bounds)).toBe('bottom-right')
  })

  it('returns top for top edge', () => {
    expect(detectHandle(2, 10, bounds)).toBe('top')
  })

  it('returns bottom for bottom edge', () => {
    expect(detectHandle(6, 10, bounds)).toBe('bottom')
  })

  it('returns left for left edge', () => {
    expect(detectHandle(4, 5, bounds)).toBe('left')
  })

  it('returns right for right edge', () => {
    expect(detectHandle(4, 20, bounds)).toBe('right')
  })

  it('returns inside for interior', () => {
    expect(detectHandle(4, 10, bounds)).toBe('inside')
  })

  it('returns outside for exterior', () => {
    expect(detectHandle(0, 0, bounds)).toBe('outside')
    expect(detectHandle(7, 10, bounds)).toBe('outside')
  })
})

describe('createTextToolHandlers', () => {
  let deps: TextToolDeps
  let handlers: TextToolHandlers

  beforeEach(() => {
    deps = {
      layersRef: { current: [makeTextLayer()] },
      activeLayerIdRef: { current: 'text-1' },
      brushRef: { current: { fg: [255, 255, 255] as RGBColor } },
      addTextLayer: vi.fn(),
      updateTextLayer: vi.fn(),
      pushSnapshot: vi.fn(),
      rerenderGrid: vi.fn(),
      textBoundsRef: { current: document.createElement('div') },
      textCursorRef: { current: document.createElement('div') },
      containerRef: { current: document.createElement('div') },
    }
    handlers = createTextToolHandlers(deps)
  })

  describe('state machine: idle → drawing → editing', () => {
    it('starts in idle state', () => {
      expect(handlers.getPhase()).toBe('idle')
    })

    it('transitions to drawing on mousedown in empty area', () => {
      deps.layersRef.current = [] // no text layers to click on
      handlers = createTextToolHandlers(deps)
      handlers.onMouseDown(5, 10)
      expect(handlers.getPhase()).toBe('drawing')
    })

    it('transitions to editing on mouseup after drawing', () => {
      deps.layersRef.current = [] // no text layers
      handlers = createTextToolHandlers(deps)
      handlers.onMouseDown(5, 10)
      handlers.onMouseMove(8, 20)
      handlers.onMouseUp()
      expect(handlers.getPhase()).toBe('editing')
      expect(deps.addTextLayer).toHaveBeenCalled()
    })

    it('creates text layer with correct bounds from drag extents', () => {
      deps.layersRef.current = [] // no text layers
      handlers = createTextToolHandlers(deps)
      handlers.onMouseDown(2, 5)
      handlers.onMouseMove(8, 30)
      handlers.onMouseUp()
      expect(deps.addTextLayer).toHaveBeenCalledWith(
        'Text',
        { r0: 2, c0: 5, r1: 8, c1: 30 },
        expect.any(Array),
      )
    })

    it('creates correct bounds when dragging top-right to bottom-left', () => {
      deps.layersRef.current = []
      handlers = createTextToolHandlers(deps)
      handlers.onMouseDown(8, 30)
      handlers.onMouseMove(2, 5)
      handlers.onMouseUp()
      expect(deps.addTextLayer).toHaveBeenCalledWith(
        'Text',
        { r0: 2, c0: 5, r1: 8, c1: 30 },
        expect.any(Array),
      )
    })

    it('creates single-cell bounds on click without drag', () => {
      deps.layersRef.current = []
      handlers = createTextToolHandlers(deps)
      handlers.onMouseDown(5, 10)
      // No mouse move — just mouse up at same position
      handlers.onMouseUp()
      expect(deps.addTextLayer).toHaveBeenCalledWith(
        'Text',
        { r0: 5, c0: 10, r1: 5, c1: 10 },
        expect.any(Array),
      )
    })
  })

  describe('state machine: idle → editing (click existing text layer)', () => {
    it('transitions to editing when clicking on existing text layer bounds', () => {
      const textLayer = makeTextLayer({ bounds: { r0: 2, c0: 5, r1: 6, c1: 20 } })
      deps.layersRef.current = [textLayer]
      deps.activeLayerIdRef.current = 'text-1'
      handlers = createTextToolHandlers(deps)
      handlers.onMouseDown(4, 10) // inside bounds
      expect(handlers.getPhase()).toBe('editing')
    })
  })

  describe('keyboard handling', () => {
    it('inserts printable characters into text', () => {
      const textLayer = makeTextLayer({ text: '', bounds: { r0: 0, c0: 0, r1: 5, c1: 20 } })
      deps.layersRef.current = [textLayer]
      deps.activeLayerIdRef.current = 'text-1'
      handlers = createTextToolHandlers(deps)
      handlers.onMouseDown(2, 10) // enter editing
      handlers.onKeyDown(new KeyboardEvent('keydown', { key: 'A' }))
      expect(deps.updateTextLayer).toHaveBeenCalledWith('text-1', expect.objectContaining({ text: 'A' }))
    })

    it('handles Backspace', () => {
      const textLayer = makeTextLayer({ text: 'AB', bounds: { r0: 0, c0: 0, r1: 5, c1: 20 } })
      deps.layersRef.current = [textLayer]
      deps.activeLayerIdRef.current = 'text-1'
      handlers = createTextToolHandlers(deps)
      handlers.onMouseDown(2, 10) // enter editing at cursor position 2 (end of text)
      handlers.onKeyDown(new KeyboardEvent('keydown', { key: 'Backspace' }))
      expect(deps.updateTextLayer).toHaveBeenCalledWith('text-1', expect.objectContaining({ text: 'A' }))
    })

    it('handles Enter to insert newline', () => {
      const textLayer = makeTextLayer({ text: 'Hi', bounds: { r0: 0, c0: 0, r1: 5, c1: 20 } })
      deps.layersRef.current = [textLayer]
      deps.activeLayerIdRef.current = 'text-1'
      handlers = createTextToolHandlers(deps)
      handlers.onMouseDown(2, 10)
      handlers.onKeyDown(new KeyboardEvent('keydown', { key: 'Enter' }))
      expect(deps.updateTextLayer).toHaveBeenCalledWith('text-1', expect.objectContaining({ text: expect.stringContaining('\n') }))
    })

    it('handles Escape to commit and exit editing', () => {
      const textLayer = makeTextLayer({ text: '', bounds: { r0: 0, c0: 0, r1: 5, c1: 20 } })
      deps.layersRef.current = [textLayer]
      deps.activeLayerIdRef.current = 'text-1'
      handlers = createTextToolHandlers(deps)
      handlers.onMouseDown(2, 10) // enter editing
      handlers.onKeyDown(new KeyboardEvent('keydown', { key: 'Escape' }))
      expect(handlers.getPhase()).toBe('idle')
    })

    it('ignores Ctrl combos to allow undo/redo passthrough', () => {
      const textLayer = makeTextLayer({ text: '', bounds: { r0: 0, c0: 0, r1: 5, c1: 20 } })
      deps.layersRef.current = [textLayer]
      deps.activeLayerIdRef.current = 'text-1'
      handlers = createTextToolHandlers(deps)
      handlers.onMouseDown(2, 10) // enter editing
      handlers.onKeyDown(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }))
      // Should not insert 'z' into text
      expect(deps.updateTextLayer).not.toHaveBeenCalled()
    })
  })

  describe('commitIfEditing', () => {
    it('transitions from editing to idle', () => {
      const textLayer = makeTextLayer({ bounds: { r0: 2, c0: 5, r1: 6, c1: 20 } })
      deps.layersRef.current = [textLayer]
      deps.activeLayerIdRef.current = 'text-1'
      handlers = createTextToolHandlers(deps)
      handlers.onMouseDown(4, 10) // enter editing
      expect(handlers.getPhase()).toBe('editing')
      handlers.commitIfEditing()
      expect(handlers.getPhase()).toBe('idle')
    })

    it('is a no-op when already idle', () => {
      handlers.commitIfEditing()
      expect(handlers.getPhase()).toBe('idle')
    })

    it('calls onExitEditing callback when exiting editing', () => {
      const onExitEditing = vi.fn()
      const textLayer = makeTextLayer({ bounds: { r0: 2, c0: 5, r1: 6, c1: 20 } })
      deps.layersRef.current = [textLayer]
      deps.activeLayerIdRef.current = 'text-1'
      deps.onExitEditing = onExitEditing
      handlers = createTextToolHandlers(deps)
      handlers.onMouseDown(4, 10) // enter editing
      expect(handlers.getPhase()).toBe('editing')
      handlers.commitIfEditing()
      expect(onExitEditing).toHaveBeenCalledTimes(1)
    })

    it('calls onExitEditing on Escape key', () => {
      const onExitEditing = vi.fn()
      const textLayer = makeTextLayer({ text: '', bounds: { r0: 0, c0: 0, r1: 5, c1: 20 } })
      deps.layersRef.current = [textLayer]
      deps.activeLayerIdRef.current = 'text-1'
      deps.onExitEditing = onExitEditing
      handlers = createTextToolHandlers(deps)
      handlers.onMouseDown(2, 10)
      handlers.onKeyDown(new KeyboardEvent('keydown', { key: 'Escape' }))
      expect(onExitEditing).toHaveBeenCalledTimes(1)
    })

    it('calls onExitEditing on click outside bounds', () => {
      const onExitEditing = vi.fn()
      const textLayer = makeTextLayer({ bounds: { r0: 2, c0: 5, r1: 6, c1: 20 } })
      deps.layersRef.current = [textLayer]
      deps.activeLayerIdRef.current = 'text-1'
      deps.onExitEditing = onExitEditing
      handlers = createTextToolHandlers(deps)
      handlers.onMouseDown(4, 10) // enter editing
      handlers.onMouseDown(0, 0) // click outside
      expect(onExitEditing).toHaveBeenCalledTimes(1)
    })
  })

  describe('moving', () => {
    it('moves bounds on drag inside', () => {
      const textLayer = makeTextLayer({ bounds: { r0: 2, c0: 5, r1: 6, c1: 20 } })
      deps.layersRef.current = [textLayer]
      deps.activeLayerIdRef.current = 'text-1'
      handlers = createTextToolHandlers(deps)
      // Enter editing first
      handlers.onMouseDown(4, 10) // inside bounds
      expect(handlers.getPhase()).toBe('editing')
      // Now drag from inside
      handlers.onMouseDown(4, 10)
      expect(handlers.getPhase()).toBe('moving')
      handlers.onMouseMove(6, 12) // move down 2, right 2
      handlers.onMouseUp()
      expect(handlers.getPhase()).toBe('editing')
      expect(deps.updateTextLayer).toHaveBeenCalledWith('text-1', expect.objectContaining({
        bounds: { r0: 4, c0: 7, r1: 8, c1: 22 },
      }))
    })
  })

  describe('per-character color splicing', () => {
    it('typing a character inserts the brush FG color into textFgColors', () => {
      const brushFg: RGBColor = [255, 0, 0]
      const textLayer = makeTextLayer({ text: '', textFgColors: [], bounds: { r0: 0, c0: 0, r1: 5, c1: 20 } })
      deps.layersRef.current = [textLayer]
      deps.activeLayerIdRef.current = 'text-1'
      deps.brushRef = { current: { fg: brushFg } }
      handlers = createTextToolHandlers(deps)
      handlers.onMouseDown(2, 10) // enter editing
      handlers.onKeyDown(new KeyboardEvent('keydown', { key: 'A' }))
      expect(deps.updateTextLayer).toHaveBeenCalledWith('text-1', expect.objectContaining({
        text: 'A',
        textFgColors: [brushFg],
      }))
    })

    it('backspace removes the color at cursorPos-1', () => {
      const red: RGBColor = [255, 0, 0]
      const blue: RGBColor = [0, 0, 255]
      const textLayer = makeTextLayer({ text: 'AB', textFgColors: [red, blue], bounds: { r0: 0, c0: 0, r1: 5, c1: 20 } })
      deps.layersRef.current = [textLayer]
      deps.activeLayerIdRef.current = 'text-1'
      handlers = createTextToolHandlers(deps)
      handlers.onMouseDown(2, 10) // enter editing, cursor at end (pos 2)
      handlers.onKeyDown(new KeyboardEvent('keydown', { key: 'Backspace' }))
      expect(deps.updateTextLayer).toHaveBeenCalledWith('text-1', expect.objectContaining({
        text: 'A',
        textFgColors: [red],
      }))
    })

    it('delete removes the color at cursorPos', () => {
      const red: RGBColor = [255, 0, 0]
      const blue: RGBColor = [0, 0, 255]
      const textLayer = makeTextLayer({ text: 'AB', textFgColors: [red, blue], bounds: { r0: 0, c0: 0, r1: 5, c1: 20 } })
      deps.layersRef.current = [textLayer]
      deps.activeLayerIdRef.current = 'text-1'
      handlers = createTextToolHandlers(deps)
      handlers.onMouseDown(2, 10) // enter editing, cursor at end (pos 2)
      // Move cursor to position 0
      handlers.onKeyDown(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
      handlers.onKeyDown(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
      handlers.onKeyDown(new KeyboardEvent('keydown', { key: 'Delete' }))
      expect(deps.updateTextLayer).toHaveBeenCalledWith('text-1', expect.objectContaining({
        text: 'B',
        textFgColors: [blue],
      }))
    })

    it('enter inserts the brush FG color at cursorPos', () => {
      const red: RGBColor = [255, 0, 0]
      const brushFg: RGBColor = [0, 255, 0]
      const textLayer = makeTextLayer({ text: 'AB', textFgColors: [red, red], bounds: { r0: 0, c0: 0, r1: 5, c1: 20 } })
      deps.layersRef.current = [textLayer]
      deps.activeLayerIdRef.current = 'text-1'
      deps.brushRef = { current: { fg: brushFg } }
      handlers = createTextToolHandlers(deps)
      handlers.onMouseDown(2, 10) // enter editing, cursor at end (pos 2)
      handlers.onKeyDown(new KeyboardEvent('keydown', { key: 'Enter' }))
      expect(deps.updateTextLayer).toHaveBeenCalledWith('text-1', expect.objectContaining({
        text: 'AB\n',
        textFgColors: [red, red, brushFg],
      }))
    })

    it('handles missing textFgColors (backward compat — treats as empty)', () => {
      const brushFg: RGBColor = [255, 0, 0]
      const textLayer = makeTextLayer({ text: 'A', bounds: { r0: 0, c0: 0, r1: 5, c1: 20 } })
      // Explicitly remove textFgColors to simulate old data
      delete (textLayer as Partial<import('./types').TextLayer>).textFgColors
      deps.layersRef.current = [textLayer]
      deps.activeLayerIdRef.current = 'text-1'
      deps.brushRef = { current: { fg: brushFg } }
      handlers = createTextToolHandlers(deps)
      handlers.onMouseDown(2, 10) // enter editing
      handlers.onKeyDown(new KeyboardEvent('keydown', { key: 'B' }))
      expect(deps.updateTextLayer).toHaveBeenCalledWith('text-1', expect.objectContaining({
        text: 'AB',
        textFgColors: expect.any(Array),
      }))
    })
  })

  describe('reset', () => {
    it('clears all state when in drawing phase (where commitIfEditing is a no-op)', () => {
      deps.layersRef.current = []
      handlers = createTextToolHandlers(deps)
      // Enter drawing phase
      handlers.onMouseDown(5, 10)
      expect(handlers.getPhase()).toBe('drawing')
      // commitIfEditing does nothing for drawing phase
      handlers.commitIfEditing()
      expect(handlers.getPhase()).toBe('drawing')
      // reset() should unconditionally reset
      handlers.reset()
      expect(handlers.getPhase()).toBe('idle')
    })

    it('clears state when in editing phase', () => {
      const textLayer = makeTextLayer({ bounds: { r0: 2, c0: 5, r1: 6, c1: 20 } })
      deps.layersRef.current = [textLayer]
      deps.activeLayerIdRef.current = 'text-1'
      handlers = createTextToolHandlers(deps)
      handlers.onMouseDown(4, 10) // enter editing
      expect(handlers.getPhase()).toBe('editing')
      handlers.reset()
      expect(handlers.getPhase()).toBe('idle')
    })

    it('does not call onExitEditing', () => {
      const onExitEditing = vi.fn()
      const textLayer = makeTextLayer({ bounds: { r0: 2, c0: 5, r1: 6, c1: 20 } })
      deps.layersRef.current = [textLayer]
      deps.activeLayerIdRef.current = 'text-1'
      deps.onExitEditing = onExitEditing
      handlers = createTextToolHandlers(deps)
      handlers.onMouseDown(4, 10) // enter editing
      handlers.reset()
      expect(onExitEditing).not.toHaveBeenCalled()
    })

    it('hides overlay elements', () => {
      const textLayer = makeTextLayer({ bounds: { r0: 2, c0: 5, r1: 6, c1: 20 } })
      deps.layersRef.current = [textLayer]
      deps.activeLayerIdRef.current = 'text-1'
      handlers = createTextToolHandlers(deps)
      handlers.onMouseDown(4, 10) // enter editing
      handlers.reset()
      expect(deps.textBoundsRef.current!.style.display).toBe('none')
      expect(deps.textCursorRef.current!.style.display).toBe('none')
    })
  })

  describe('resizing', () => {
    it('resizes bounds on drag from corner', () => {
      const textLayer = makeTextLayer({ bounds: { r0: 2, c0: 5, r1: 6, c1: 20 } })
      deps.layersRef.current = [textLayer]
      deps.activeLayerIdRef.current = 'text-1'
      handlers = createTextToolHandlers(deps)
      // Enter editing first
      handlers.onMouseDown(4, 10) // inside bounds
      expect(handlers.getPhase()).toBe('editing')
      // Now drag from bottom-right corner
      handlers.onMouseDown(6, 20) // bottom-right corner
      expect(handlers.getPhase()).toBe('resizing')
      handlers.onMouseMove(6, 25) // extend right by 5
      handlers.onMouseUp()
      expect(handlers.getPhase()).toBe('editing')
      expect(deps.updateTextLayer).toHaveBeenCalledWith('text-1', expect.objectContaining({
        bounds: expect.objectContaining({ c1: 25 }),
      }))
    })

    it('edge clicks trigger moving, not resizing', () => {
      const textLayer = makeTextLayer({ bounds: { r0: 2, c0: 5, r1: 6, c1: 20 } })
      deps.layersRef.current = [textLayer]
      deps.activeLayerIdRef.current = 'text-1'
      handlers = createTextToolHandlers(deps)
      handlers.onMouseDown(4, 10) // enter editing
      expect(handlers.getPhase()).toBe('editing')
      // Click on right edge — should move, not resize
      handlers.onMouseDown(4, 20) // right edge
      expect(handlers.getPhase()).toBe('moving')
    })

    it('enforces minimum 1x1 bounds', () => {
      const textLayer = makeTextLayer({ bounds: { r0: 2, c0: 5, r1: 6, c1: 20 } })
      deps.layersRef.current = [textLayer]
      deps.activeLayerIdRef.current = 'text-1'
      handlers = createTextToolHandlers(deps)
      handlers.onMouseDown(4, 10) // enter editing
      handlers.onMouseDown(6, 20) // bottom-right corner → resizing
      handlers.onMouseMove(0, 2) // drag way past top-left
      handlers.onMouseUp()
      // Both r1 and c1 should be clamped to r0/c0
      expect(deps.updateTextLayer).toHaveBeenCalledWith('text-1', expect.objectContaining({
        bounds: expect.objectContaining({ r1: 2, c1: 5 }),
      }))
    })
  })
})
