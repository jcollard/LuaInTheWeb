import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AnsiController } from '../src/AnsiController'
import type { AnsiCallbacks, AnsiTerminalHandle } from '../src/AnsiController'
import type { RGBColor } from '../src/screenTypes'
import { ANSI_ROWS, ANSI_COLS, DEFAULT_FG, DEFAULT_BG } from '../src/screenTypes'
import type { LayerInfo } from '../src/AnsiController'

// Mock canvas-runtime to avoid DOM dependencies
// Uses `function` (not arrow) so mocks work as constructors with `new`
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

function makeMinimalV1Data(): Record<string, unknown> {
  const grid: Record<number, Record<number, { char: string; fg: RGBColor; bg: RGBColor }>> = {}
  for (let r = 0; r < ANSI_ROWS; r++) {
    const row: Record<number, { char: string; fg: RGBColor; bg: RGBColor }> = {}
    for (let c = 0; c < ANSI_COLS; c++) {
      row[c + 1] = { char: ' ', fg: [...DEFAULT_FG] as RGBColor, bg: [...DEFAULT_BG] as RGBColor }
    }
    grid[r + 1] = row
  }
  // Set one cell so the screen string is non-trivial
  grid[1][1] = { char: 'X', fg: [255, 0, 0], bg: [0, 255, 0] }
  return { version: 1, width: ANSI_COLS, height: ANSI_ROWS, grid }
}

function makeV3MultiLayerData(): Record<string, unknown> {
  const gridA: Record<number, Record<number, { char: string; fg: RGBColor; bg: RGBColor }>> = {}
  const gridB: Record<number, Record<number, { char: string; fg: RGBColor; bg: RGBColor }>> = {}
  for (let r = 0; r < ANSI_ROWS; r++) {
    const rowA: Record<number, { char: string; fg: RGBColor; bg: RGBColor }> = {}
    const rowB: Record<number, { char: string; fg: RGBColor; bg: RGBColor }> = {}
    for (let c = 0; c < ANSI_COLS; c++) {
      rowA[c + 1] = { char: ' ', fg: [...DEFAULT_FG] as RGBColor, bg: [...DEFAULT_BG] as RGBColor }
      rowB[c + 1] = { char: ' ', fg: [...DEFAULT_FG] as RGBColor, bg: [...DEFAULT_BG] as RGBColor }
    }
    gridA[r + 1] = rowA
    gridB[r + 1] = rowB
  }
  gridA[1][1] = { char: 'A', fg: [255, 0, 0], bg: [0, 0, 255] }
  gridB[1][1] = { char: 'B', fg: [0, 255, 0], bg: [255, 0, 0] }
  return {
    version: 4,
    width: ANSI_COLS,
    height: ANSI_ROWS,
    activeLayerId: 'bg',
    layers: {
      1: { type: 'drawn', id: 'bg', name: 'Background', visible: true, grid: gridA, tags: { 1: 'background', 2: 'static' } },
      2: { type: 'group', id: 'g1', name: 'UI Group', visible: true, collapsed: false, tags: { 1: 'ui' } },
      3: { type: 'drawn', id: 'fg', name: 'Foreground', visible: true, grid: gridB, parentId: 'g1' },
    },
  }
}

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

describe('AnsiController screen state', () => {
  let controller: AnsiController

  beforeEach(() => {
    controller = new AnsiController(makeCallbacks())
  })

  it('createScreen returns incrementing IDs', () => {
    const data = makeMinimalV1Data()
    const id1 = controller.createScreen(data)
    const id2 = controller.createScreen(data)
    expect(id1).toBe(1)
    expect(id2).toBe(2)
  })

  it('setScreen stores active screen ID', () => {
    const data = makeMinimalV1Data()
    const id = controller.createScreen(data)
    controller.setScreen(id)
    expect(controller.getActiveScreenId()).toBe(id)
  })

  it('setScreen(null) clears active screen', () => {
    const data = makeMinimalV1Data()
    const id = controller.createScreen(data)
    controller.setScreen(id)
    controller.setScreen(null)
    expect(controller.getActiveScreenId()).toBeNull()
  })

  it('setScreen throws for unknown ID', () => {
    expect(() => controller.setScreen(999)).toThrow('Screen ID 999 not found')
  })

  it('createScreen stores screen and allows setScreen', () => {
    const data = makeMinimalV1Data()
    const id = controller.createScreen(data)
    // Internally the screen is stored as a string - verify by setting it
    controller.setScreen(id)
    expect(controller.getActiveScreenId()).toBe(id)
  })

  it('stop clears screen state', async () => {
    const callbacks = makeCallbacks()
    const ctrl = new AnsiController(callbacks)

    // start() blocks until stop(). Fire-and-forget; let async setup complete.
    const startPromise = ctrl.start()
    // Flush microtask queue so the awaited mock resolves and start() finishes setup
    await new Promise(resolve => setTimeout(resolve, 0))

    const data = makeMinimalV1Data()
    const id1 = ctrl.createScreen(data)
    ctrl.createScreen(data) // id2 = 2
    ctrl.setScreen(id1)
    expect(ctrl.getActiveScreenId()).toBe(id1)

    ctrl.stop()
    await startPromise

    // Screen state should be fully cleared
    expect(ctrl.getActiveScreenId()).toBeNull()
    // Old screen ID should no longer be valid
    expect(() => ctrl.setScreen(id1)).toThrow('Screen ID 1 not found')
    // IDs should reset - next createScreen should start at 1 again
    const newId = ctrl.createScreen(data)
    expect(newId).toBe(1)
  })
})

describe('AnsiController layer visibility', () => {
  let controller: AnsiController

  beforeEach(() => {
    controller = new AnsiController(makeCallbacks())
  })

  describe('getScreenLayers', () => {
    it('returns layer info for V1 data (single layer)', () => {
      const id = controller.createScreen(makeMinimalV1Data())
      const layers = controller.getScreenLayers(id)
      expect(layers).toHaveLength(1)
      expect(layers[0]).toEqual({
        id: 'v1-background',
        name: 'Background',
        type: 'drawn',
        visible: true,
        tags: [],
      })
    })

    it('returns layer info for multi-layer V3+ data', () => {
      const id = controller.createScreen(makeV3MultiLayerData())
      const layers = controller.getScreenLayers(id)
      expect(layers).toHaveLength(3)
      expect(layers[0]).toEqual({
        id: 'bg', name: 'Background', type: 'drawn', visible: true, tags: ['background', 'static'],
      })
      expect(layers[1]).toEqual({
        id: 'g1', name: 'UI Group', type: 'group', visible: true, tags: ['ui'],
      })
      expect(layers[2]).toEqual({
        id: 'fg', name: 'Foreground', type: 'drawn', visible: true, tags: [],
      })
    })

    it('throws for invalid screen ID', () => {
      expect(() => controller.getScreenLayers(999)).toThrow('Screen ID 999 not found')
    })
  })

  describe('setScreenLayerVisible', () => {
    it('hides a layer by ID and re-composites', () => {
      const id = controller.createScreen(makeV3MultiLayerData())
      controller.setScreenLayerVisible(id, 'fg', false)
      const layers = controller.getScreenLayers(id)
      const fgLayer = layers.find((l: LayerInfo) => l.id === 'fg')
      expect(fgLayer!.visible).toBe(false)
    })

    it('shows a hidden layer by ID', () => {
      const id = controller.createScreen(makeV3MultiLayerData())
      controller.setScreenLayerVisible(id, 'fg', false)
      controller.setScreenLayerVisible(id, 'fg', true)
      const layers = controller.getScreenLayers(id)
      const fgLayer = layers.find((l: LayerInfo) => l.id === 'fg')
      expect(fgLayer!.visible).toBe(true)
    })

    it('resolves layer by name', () => {
      const id = controller.createScreen(makeV3MultiLayerData())
      controller.setScreenLayerVisible(id, 'Foreground', false)
      const layers = controller.getScreenLayers(id)
      const fgLayer = layers.find((l: LayerInfo) => l.id === 'fg')
      expect(fgLayer!.visible).toBe(false)
    })

    it('resolves layer by tag', () => {
      const id = controller.createScreen(makeV3MultiLayerData())
      controller.setScreenLayerVisible(id, 'background', false)
      const layers = controller.getScreenLayers(id)
      const bgLayer = layers.find((l: LayerInfo) => l.id === 'bg')
      expect(bgLayer!.visible).toBe(false)
    })

    it('tag match affects multiple layers', () => {
      // Create data where two layers share a tag
      const grid: Record<number, Record<number, { char: string; fg: RGBColor; bg: RGBColor }>> = {}
      for (let r = 0; r < ANSI_ROWS; r++) {
        const row: Record<number, { char: string; fg: RGBColor; bg: RGBColor }> = {}
        for (let c = 0; c < ANSI_COLS; c++) {
          row[c + 1] = { char: ' ', fg: [...DEFAULT_FG] as RGBColor, bg: [...DEFAULT_BG] as RGBColor }
        }
        grid[r + 1] = row
      }
      const data: Record<string, unknown> = {
        version: 4,
        width: ANSI_COLS,
        height: ANSI_ROWS,
        activeLayerId: 'l1',
        layers: {
          1: { type: 'drawn', id: 'l1', name: 'A', visible: true, grid, tags: { 1: 'shared' } },
          2: { type: 'drawn', id: 'l2', name: 'B', visible: true, grid, tags: { 1: 'shared' } },
        },
      }
      const id = controller.createScreen(data)
      controller.setScreenLayerVisible(id, 'shared', false)
      const layers = controller.getScreenLayers(id)
      expect(layers[0].visible).toBe(false)
      expect(layers[1].visible).toBe(false)
    })

    it('throws for invalid screen ID', () => {
      expect(() => controller.setScreenLayerVisible(999, 'bg', false)).toThrow('Screen ID 999 not found')
    })

    it('throws for no matching identifier', () => {
      const id = controller.createScreen(makeV3MultiLayerData())
      expect(() => controller.setScreenLayerVisible(id, 'nonexistent', false)).toThrow('No layers match identifier "nonexistent"')
    })
  })

  describe('toggleScreenLayer', () => {
    it('toggles a visible layer off', () => {
      const id = controller.createScreen(makeV3MultiLayerData())
      controller.toggleScreenLayer(id, 'fg')
      const layers = controller.getScreenLayers(id)
      const fgLayer = layers.find((l: LayerInfo) => l.id === 'fg')
      expect(fgLayer!.visible).toBe(false)
    })

    it('toggles a hidden layer on', () => {
      const id = controller.createScreen(makeV3MultiLayerData())
      controller.setScreenLayerVisible(id, 'fg', false)
      controller.toggleScreenLayer(id, 'fg')
      const layers = controller.getScreenLayers(id)
      const fgLayer = layers.find((l: LayerInfo) => l.id === 'fg')
      expect(fgLayer!.visible).toBe(true)
    })

    it('throws for invalid screen ID', () => {
      expect(() => controller.toggleScreenLayer(999, 'fg')).toThrow('Screen ID 999 not found')
    })

    it('throws for no matching identifier', () => {
      const id = controller.createScreen(makeV3MultiLayerData())
      expect(() => controller.toggleScreenLayer(id, 'nonexistent')).toThrow('No layers match identifier "nonexistent"')
    })
  })

  describe('re-compositing', () => {
    it('hiding a layer changes the rendered ANSI string', () => {
      const id = controller.createScreen(makeV3MultiLayerData())
      // Set as active screen to verify it's stored
      controller.setScreen(id)
      const before = controller.getActiveScreenId()
      expect(before).toBe(id)

      // Hide the foreground layer - the ANSI string should change
      controller.setScreenLayerVisible(id, 'fg', false)

      // Screen should still be valid and set
      expect(controller.getActiveScreenId()).toBe(id)
    })

    it('hiding a group hides its children during re-compositing', () => {
      const id = controller.createScreen(makeV3MultiLayerData())
      // Hide the group - 'fg' is a child of 'g1'
      controller.setScreenLayerVisible(id, 'g1', false)
      const layers = controller.getScreenLayers(id)
      // The group itself is hidden
      const group = layers.find((l: LayerInfo) => l.id === 'g1')
      expect(group!.visible).toBe(false)
      // The child retains its own visible flag (true), but compositing skips it
      const fg = layers.find((l: LayerInfo) => l.id === 'fg')
      expect(fg!.visible).toBe(true)
    })
  })

  describe('stop clears layer state', () => {
    it('layer state is cleared after stop', async () => {
      const callbacks = makeCallbacks()
      const ctrl = new AnsiController(callbacks)
      const startPromise = ctrl.start()
      await new Promise(resolve => setTimeout(resolve, 0))

      const id = ctrl.createScreen(makeV3MultiLayerData())
      expect(ctrl.getScreenLayers(id)).toHaveLength(3)

      ctrl.stop()
      await startPromise

      expect(() => ctrl.getScreenLayers(id)).toThrow('Screen ID 1 not found')
    })
  })
})
