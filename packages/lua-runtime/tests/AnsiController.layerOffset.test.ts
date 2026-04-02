import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AnsiController } from '../src/AnsiController'
import type { AnsiCallbacks, AnsiTerminalHandle } from '../src/AnsiController'
import type { RGBColor } from '../src/screenTypes'
import { ANSI_ROWS, ANSI_COLS, DEFAULT_FG, DEFAULT_BG } from '../src/screenTypes'

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

function makeV4TwoLayerData(): Record<string, unknown> {
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
  gridA[1][1] = { char: 'L', fg: [255, 0, 0], bg: [0, 0, 0] }
  gridB[1][1] = { char: 'R', fg: [0, 0, 255], bg: [0, 0, 0] }
  return {
    version: 4,
    width: ANSI_COLS,
    height: ANSI_ROWS,
    activeLayerId: 'left',
    layers: {
      1: { type: 'drawn', id: 'left', name: 'Left Scene', visible: true, grid: gridA, tags: { 1: 'scene' } },
      2: { type: 'drawn', id: 'right', name: 'Right Scene', visible: true, grid: gridB, tags: { 1: 'scene' } },
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

describe('AnsiController layer offset', () => {
  let controller: AnsiController

  beforeEach(() => {
    controller = new AnsiController(makeCallbacks())
  })

  describe('setScreenLayerOffset', () => {
    it('sets offset by layer id', () => {
      const id = controller.createScreen(makeV4TwoLayerData())
      controller.setScreenLayerOffset(id, 'right', 80, 0)
      const [col, row] = controller.getScreenLayerOffset(id, 'right')
      expect(col).toBe(80)
      expect(row).toBe(0)
    })

    it('sets offset by layer name', () => {
      const id = controller.createScreen(makeV4TwoLayerData())
      controller.setScreenLayerOffset(id, 'Right Scene', 80, 10)
      const [col, row] = controller.getScreenLayerOffset(id, 'Right Scene')
      expect(col).toBe(80)
      expect(row).toBe(10)
    })

    it('sets offset on multiple layers matching a tag', () => {
      const id = controller.createScreen(makeV4TwoLayerData())
      controller.setScreenLayerOffset(id, 'scene', 40, 0)
      const [colL] = controller.getScreenLayerOffset(id, 'left')
      const [colR] = controller.getScreenLayerOffset(id, 'right')
      expect(colL).toBe(40)
      expect(colR).toBe(40)
    })

    it('throws for empty identifier', () => {
      const id = controller.createScreen(makeV4TwoLayerData())
      expect(() => controller.setScreenLayerOffset(id, '', 80, 0)).toThrow('must not be empty')
    })

    it('throws for unmatched identifier', () => {
      const id = controller.createScreen(makeV4TwoLayerData())
      expect(() => controller.setScreenLayerOffset(id, 'nonexistent', 80, 0)).toThrow('No layers match')
    })

    it('throws for invalid screen id', () => {
      expect(() => controller.setScreenLayerOffset(999, 'left', 0, 0)).toThrow()
    })
  })

  describe('getScreenLayerOffset', () => {
    it('returns [0, 0] for layer with no offset set', () => {
      const id = controller.createScreen(makeV4TwoLayerData())
      const [col, row] = controller.getScreenLayerOffset(id, 'left')
      expect(col).toBe(0)
      expect(row).toBe(0)
    })

    it('throws for empty identifier', () => {
      const id = controller.createScreen(makeV4TwoLayerData())
      expect(() => controller.getScreenLayerOffset(id, '')).toThrow('must not be empty')
    })

    it('throws for unmatched identifier', () => {
      const id = controller.createScreen(makeV4TwoLayerData())
      expect(() => controller.getScreenLayerOffset(id, 'nonexistent')).toThrow('No layers match')
    })
  })

  describe('getScreenLayers includes offset info', () => {
    it('returns offsetCol and offsetRow in layer info', () => {
      const id = controller.createScreen(makeV4TwoLayerData())
      controller.setScreenLayerOffset(id, 'right', 80, 0)
      const layers = controller.getScreenLayers(id)
      const rightLayer = layers.find(l => l.id === 'right')
      expect(rightLayer?.offsetCol).toBe(80)
      expect(rightLayer?.offsetRow).toBe(0)
      const leftLayer = layers.find(l => l.id === 'left')
      expect(leftLayer?.offsetCol).toBe(0)
      expect(leftLayer?.offsetRow).toBe(0)
    })
  })
})
