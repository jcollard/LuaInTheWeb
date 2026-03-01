import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AnsiController } from '../src/AnsiController'
import type { AnsiCallbacks, AnsiTerminalHandle } from '../src/AnsiController'
import type { RGBColor, TextLayerData } from '../src/screenTypes'
import { ANSI_ROWS, ANSI_COLS, DEFAULT_FG, DEFAULT_BG } from '../src/screenTypes'

// Mock canvas-runtime to avoid DOM dependencies
vi.mock('@lua-learning/canvas-runtime', () => ({
  InputCapture: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
    this.dispose = vi.fn()
    this.update = vi.fn()
  }),
  GameLoopController: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
    this.start = vi.fn()
    this.stop = vi.fn()
    this.dispose = vi.fn()
  }),
}))

function makeCallbacks(): AnsiCallbacks {
  return {
    onRequestAnsiTab: vi.fn().mockResolvedValue({
      write: vi.fn(),
      container: { getBoundingClientRect: () => ({ width: 0, height: 0 }) },
      dispose: vi.fn(),
    } as unknown as AnsiTerminalHandle),
    onCloseAnsiTab: vi.fn(),
  }
}

function makeEmptyGrid(): Record<number, Record<number, { char: string; fg: RGBColor; bg: RGBColor }>> {
  const grid: Record<number, Record<number, { char: string; fg: RGBColor; bg: RGBColor }>> = {}
  for (let r = 0; r < ANSI_ROWS; r++) {
    const row: Record<number, { char: string; fg: RGBColor; bg: RGBColor }> = {}
    for (let c = 0; c < ANSI_COLS; c++) {
      row[c + 1] = { char: ' ', fg: [...DEFAULT_FG] as RGBColor, bg: [...DEFAULT_BG] as RGBColor }
    }
    grid[r + 1] = row
  }
  return grid
}

function makeTextLayerData(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version: 4,
    width: ANSI_COLS,
    height: ANSI_ROWS,
    activeLayerId: 'text1',
    layers: {
      1: {
        type: 'text',
        id: 'text1',
        name: 'Direction',
        visible: true,
        text: 'NORTH',
        bounds: { r0: 0, c0: 0, r1: 0, c1: 19 },
        textFg: [170, 170, 170],
        tags: { 1: 'direction' },
        ...overrides,
      },
    },
  }
}

function makeMultiTextLayerData(): Record<string, unknown> {
  return {
    version: 4,
    width: ANSI_COLS,
    height: ANSI_ROWS,
    activeLayerId: 'text1',
    layers: {
      1: {
        type: 'text',
        id: 'text1',
        name: 'Label A',
        visible: true,
        text: 'AAA',
        bounds: { r0: 0, c0: 0, r1: 0, c1: 19 },
        textFg: [170, 170, 170],
        tags: { 1: 'info' },
      },
      2: {
        type: 'text',
        id: 'text2',
        name: 'Label B',
        visible: true,
        text: 'BBB',
        bounds: { r0: 1, c0: 0, r1: 1, c1: 19 },
        textFg: [170, 170, 170],
        tags: { 1: 'info' },
      },
    },
  }
}

function makeMixedLayerData(): Record<string, unknown> {
  return {
    version: 4,
    width: ANSI_COLS,
    height: ANSI_ROWS,
    activeLayerId: 'drawn1',
    layers: {
      1: {
        type: 'drawn',
        id: 'drawn1',
        name: 'Background',
        visible: true,
        grid: makeEmptyGrid(),
        tags: { 1: 'mixed' },
      },
      2: {
        type: 'text',
        id: 'text1',
        name: 'Label',
        visible: true,
        text: 'Hello',
        bounds: { r0: 0, c0: 0, r1: 0, c1: 19 },
        textFg: [170, 170, 170],
        tags: { 1: 'mixed' },
      },
    },
  }
}

describe('AnsiController.setScreenLabel', () => {
  let controller: AnsiController

  beforeEach(() => {
    controller = new AnsiController(makeCallbacks())
  })

  describe('identifier resolution', () => {
    it('sets text on a text layer by ID', () => {
      const id = controller.createScreen(makeTextLayerData())
      controller.setScreenLabel(id, 'text1', 'SOUTH')
      // Verify by checking internal state indirectly via getScreenLayers
      const layers = controller.getScreenLayers(id)
      expect(layers[0].id).toBe('text1')
    })

    it('sets text on a text layer by name', () => {
      const id = controller.createScreen(makeTextLayerData())
      controller.setScreenLabel(id, 'Direction', 'EAST')
      // Should not throw - name resolves to the text layer
      const layers = controller.getScreenLayers(id)
      expect(layers[0].name).toBe('Direction')
    })

    it('sets text on a text layer by tag', () => {
      const id = controller.createScreen(makeTextLayerData())
      controller.setScreenLabel(id, 'direction', 'WEST')
      const layers = controller.getScreenLayers(id)
      expect(layers[0].tags).toContain('direction')
    })

    it('updates multiple text layers with same tag', () => {
      const id = controller.createScreen(makeMultiTextLayerData())
      // Both layers share the 'info' tag
      controller.setScreenLabel(id, 'info', 'Updated')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const state = (controller as any).screenStates.get(id)
      const textLayers = state.layers.filter((l: TextLayerData) => l.type === 'text')
      // Both text layers should have updated text
      for (const layer of textLayers) {
        expect(layer.text).toBe('Updated')
      }
    })
  })

  describe('text and color updates', () => {
    /** Helper to access internal layer data for assertions */
    function getInternalTextLayer(ctrl: AnsiController, screenId: number, layerId: string): TextLayerData {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const state = (ctrl as any).screenStates.get(screenId)
      return state.layers.find((l: TextLayerData) => l.id === layerId)
    }

    it('sets plain text without colors (clears textFgColors)', () => {
      const data = makeTextLayerData({ textFgColors: { 1: [255, 0, 0], 2: [0, 255, 0] } })
      const id = controller.createScreen(data)
      controller.setScreenLabel(id, 'text1', 'New Text')
      const layer = getInternalTextLayer(controller, id, 'text1')
      expect(layer.text).toBe('New Text')
      expect(layer.textFgColors).toBeUndefined()
    })

    it('sets text with textFg color', () => {
      const id = controller.createScreen(makeTextLayerData())
      const textFg: RGBColor = [255, 0, 0]
      controller.setScreenLabel(id, 'text1', 'Red Text', textFg)
      const layer = getInternalTextLayer(controller, id, 'text1')
      expect(layer.text).toBe('Red Text')
      expect(layer.textFg).toEqual([255, 0, 0])
    })

    it('sets text with per-character colors', () => {
      const id = controller.createScreen(makeTextLayerData())
      const textFg: RGBColor = [170, 170, 170]
      const textFgColors: RGBColor[] = [[255, 0, 0], [0, 255, 0], [0, 0, 255]]
      controller.setScreenLabel(id, 'text1', 'RGB', textFg, textFgColors)
      const layer = getInternalTextLayer(controller, id, 'text1')
      expect(layer.text).toBe('RGB')
      expect(layer.textFg).toEqual([170, 170, 170])
      expect(layer.textFgColors).toEqual([[255, 0, 0], [0, 255, 0], [0, 0, 255]])
    })

    it('preserves existing textFg when not provided', () => {
      const data = makeTextLayerData({ textFg: [255, 128, 0] })
      const id = controller.createScreen(data)
      controller.setScreenLabel(id, 'text1', 'Keep Color')
      const layer = getInternalTextLayer(controller, id, 'text1')
      expect(layer.text).toBe('Keep Color')
      expect(layer.textFg).toEqual([255, 128, 0])
    })

    it('updates grid after setting text', () => {
      const id = controller.createScreen(makeTextLayerData())
      controller.setScreenLabel(id, 'text1', 'SOUTH')
      const layer = getInternalTextLayer(controller, id, 'text1')
      // Grid should be re-rendered with the new text
      expect(layer.grid).toBeDefined()
      // AnsiGrid is 0-indexed; bounds start at r0=0, c0=0
      expect(layer.grid[0][0].char).toBe('S')
      expect(layer.grid[0][1].char).toBe('O')
    })
  })

  describe('error cases', () => {
    it('throws for invalid screen ID', () => {
      expect(() => controller.setScreenLabel(999, 'text1', 'test')).toThrow('Screen ID 999 not found')
    })

    it('throws for no matching identifier', () => {
      const id = controller.createScreen(makeTextLayerData())
      expect(() => controller.setScreenLabel(id, 'nonexistent', 'test')).toThrow('No layers match identifier "nonexistent"')
    })

    it('throws when all matching layers are non-text', () => {
      const data: Record<string, unknown> = {
        version: 4,
        width: ANSI_COLS,
        height: ANSI_ROWS,
        activeLayerId: 'drawn1',
        layers: {
          1: {
            type: 'drawn',
            id: 'drawn1',
            name: 'OnlyDrawn',
            visible: true,
            grid: makeEmptyGrid(),
            tags: {},
          },
        },
      }
      const id = controller.createScreen(data)
      expect(() => controller.setScreenLabel(id, 'drawn1', 'test')).toThrow('No text layers match identifier "drawn1"')
    })

    it('throws for empty identifier', () => {
      const id = controller.createScreen(makeTextLayerData())
      expect(() => controller.setScreenLabel(id, '', 'test')).toThrow('Layer identifier must not be empty.')
    })
  })

  describe('mixed layer types', () => {
    it('silently skips non-text layers when some text layers match', () => {
      const id = controller.createScreen(makeMixedLayerData())
      // 'mixed' tag matches both a drawn and a text layer
      // Should succeed (the text layer is updated, the drawn layer is skipped)
      controller.setScreenLabel(id, 'mixed', 'Updated')
    })
  })

  describe('re-compositing', () => {
    it('re-renders grid and recomposites after label update', () => {
      const id = controller.createScreen(makeTextLayerData())
      controller.setScreen(id)

      // Update label - should trigger re-composite
      controller.setScreenLabel(id, 'text1', 'Changed')

      // Screen should still be valid
      expect(controller.getActiveScreenId()).toBe(id)
    })
  })
})
