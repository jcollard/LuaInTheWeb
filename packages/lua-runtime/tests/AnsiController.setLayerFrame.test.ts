import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AnsiController } from '../src/AnsiController'
import type { AnsiCallbacks, AnsiTerminalHandle } from '../src/AnsiController'
import type { RGBColor, DrawnLayerData } from '../src/screenTypes'
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

function makeGrid(char: string): Record<number, Record<number, { char: string; fg: RGBColor; bg: RGBColor }>> {
  const grid: Record<number, Record<number, { char: string; fg: RGBColor; bg: RGBColor }>> = {}
  for (let r = 0; r < ANSI_ROWS; r++) {
    const row: Record<number, { char: string; fg: RGBColor; bg: RGBColor }> = {}
    for (let c = 0; c < ANSI_COLS; c++) {
      row[c + 1] = { char: ' ', fg: [...DEFAULT_FG] as RGBColor, bg: [...DEFAULT_BG] as RGBColor }
    }
    grid[r + 1] = row
  }
  grid[1][1] = { char, fg: [255, 0, 0], bg: [0, 0, 0] }
  return grid
}

function makeAnimatedScreen(frameCount = 4): Record<string, unknown> {
  const chars = 'ABCDEFGH'
  const frames: Record<number, unknown> = {}
  for (let i = 0; i < frameCount; i++) {
    frames[i + 1] = makeGrid(chars[i % chars.length])
  }
  return {
    version: 4,
    width: ANSI_COLS,
    height: ANSI_ROWS,
    activeLayerId: 'anim',
    layers: {
      1: {
        type: 'drawn',
        id: 'anim',
        name: 'Animated',
        visible: true,
        grid: frames[1],
        frames,
        currentFrameIndex: 0,
        frameDurationMs: 100,
        tags: { 1: 'fx' },
      },
      2: {
        type: 'drawn',
        id: 'static',
        name: 'Static',
        visible: true,
        grid: makeGrid('S'),
        frames: { 1: makeGrid('S') },
        currentFrameIndex: 0,
        frameDurationMs: 100,
      },
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

function getDrawnLayer(controller: AnsiController, screenId: number, layerId: string): DrawnLayerData {
  const internal = controller as unknown as { screenStates: Map<number, { layers: DrawnLayerData[] }> }
  const layer = internal.screenStates.get(screenId)?.layers.find(l => l.id === layerId)
  if (!layer) throw new Error(`Layer ${layerId} not found in screen ${screenId}`)
  return layer
}

describe('AnsiController set/get layer frame', () => {
  let controller: AnsiController
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    controller = new AnsiController(makeCallbacks())
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  describe('setScreenLayerFrame', () => {
    it('sets the current frame (1-based Lua index)', () => {
      const id = controller.createScreen(makeAnimatedScreen(4))
      controller.setScreenLayerFrame(id, 'anim', 3)
      const layer = getDrawnLayer(controller, id, 'anim')
      expect(layer.currentFrameIndex).toBe(2)
      expect(layer.grid).toBe(layer.frames[2])
      expect(warnSpy).not.toHaveBeenCalled()
    })

    it('looks up layers by name', () => {
      const id = controller.createScreen(makeAnimatedScreen(4))
      controller.setScreenLayerFrame(id, 'Animated', 2)
      expect(getDrawnLayer(controller, id, 'anim').currentFrameIndex).toBe(1)
    })

    it('looks up layers by tag', () => {
      const id = controller.createScreen(makeAnimatedScreen(4))
      controller.setScreenLayerFrame(id, 'fx', 4)
      expect(getDrawnLayer(controller, id, 'anim').currentFrameIndex).toBe(3)
    })

    it('wraps out-of-range frames using modulo and emits a console.warn', () => {
      const id = controller.createScreen(makeAnimatedScreen(4))
      controller.setScreenLayerFrame(id, 'anim', 7)
      expect(getDrawnLayer(controller, id, 'anim').currentFrameIndex).toBe(2)
      expect(warnSpy).toHaveBeenCalledTimes(1)
      expect(warnSpy.mock.calls[0][0]).toContain('set_layer_frame')
    })

    it('wraps zero and negative frames and warns', () => {
      const id = controller.createScreen(makeAnimatedScreen(4))
      controller.setScreenLayerFrame(id, 'anim', 0)
      expect(getDrawnLayer(controller, id, 'anim').currentFrameIndex).toBe(3)
      controller.setScreenLayerFrame(id, 'anim', -1)
      expect(getDrawnLayer(controller, id, 'anim').currentFrameIndex).toBe(2)
      expect(warnSpy).toHaveBeenCalledTimes(2)
    })

    it('is a no-op for non-animated drawn layers (single frame)', () => {
      const id = controller.createScreen(makeAnimatedScreen(4))
      controller.setScreenLayerFrame(id, 'static', 1)
      expect(getDrawnLayer(controller, id, 'static').currentFrameIndex).toBe(0)
      expect(warnSpy).not.toHaveBeenCalled()
    })

    it('does not change playing state', () => {
      const id = controller.createScreen(makeAnimatedScreen(4))
      controller.screenPause(id)
      controller.setScreenLayerFrame(id, 'anim', 2)
      expect(controller.screenIsPlaying(id)).toBe(false)
      controller.screenPlay(id)
      controller.setScreenLayerFrame(id, 'anim', 1)
      expect(controller.screenIsPlaying(id)).toBe(true)
    })

    it('resets schedule entry for the affected layer so it does not advance immediately', () => {
      const id = controller.createScreen(makeAnimatedScreen(4))
      controller.screenPlay(id)
      const internal = controller as unknown as { screenStates: Map<number, { schedule: Map<string, number> | null }> }
      // Prime the schedule with an entry that would advance immediately.
      internal.screenStates.get(id)!.schedule = new Map([['anim', 0]])
      controller.setScreenLayerFrame(id, 'anim', 3)
      const schedule = internal.screenStates.get(id)!.schedule!
      const advanceAt = schedule.get('anim')
      expect(advanceAt).toBeGreaterThan(0)
    })

    it('throws for empty identifier', () => {
      const id = controller.createScreen(makeAnimatedScreen(4))
      expect(() => controller.setScreenLayerFrame(id, '', 1)).toThrow('must not be empty')
    })

    it('throws for unmatched identifier', () => {
      const id = controller.createScreen(makeAnimatedScreen(4))
      expect(() => controller.setScreenLayerFrame(id, 'nonexistent', 1)).toThrow('No layers match')
    })

    it('throws for invalid screen id', () => {
      expect(() => controller.setScreenLayerFrame(999, 'anim', 1)).toThrow('Screen ID 999 not found')
    })

    it('throws for NaN frame', () => {
      const id = controller.createScreen(makeAnimatedScreen(4))
      expect(() => controller.setScreenLayerFrame(id, 'anim', NaN)).toThrow('finite number')
    })

    it('throws for Infinity frame', () => {
      const id = controller.createScreen(makeAnimatedScreen(4))
      expect(() => controller.setScreenLayerFrame(id, 'anim', Infinity)).toThrow('finite number')
    })
  })

  describe('getScreenLayerFrame', () => {
    it('returns [frame, total] for an animated layer (1-based)', () => {
      const id = controller.createScreen(makeAnimatedScreen(5))
      controller.setScreenLayerFrame(id, 'anim', 3)
      const [frame, total] = controller.getScreenLayerFrame(id, 'anim')
      expect(frame).toBe(3)
      expect(total).toBe(5)
    })

    it('returns [1, 1] for a single-frame drawn layer', () => {
      const id = controller.createScreen(makeAnimatedScreen(4))
      const [frame, total] = controller.getScreenLayerFrame(id, 'static')
      expect(frame).toBe(1)
      expect(total).toBe(1)
    })

    it('throws for empty identifier', () => {
      const id = controller.createScreen(makeAnimatedScreen(4))
      expect(() => controller.getScreenLayerFrame(id, '')).toThrow('must not be empty')
    })

    it('throws for unmatched identifier', () => {
      const id = controller.createScreen(makeAnimatedScreen(4))
      expect(() => controller.getScreenLayerFrame(id, 'nonexistent')).toThrow('No layers match')
    })

    it('throws for invalid screen id', () => {
      expect(() => controller.getScreenLayerFrame(999, 'anim')).toThrow('Screen ID 999 not found')
    })
  })
})
