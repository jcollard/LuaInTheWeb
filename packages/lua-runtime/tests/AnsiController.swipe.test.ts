import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AnsiController } from '../src/AnsiController'
import type { AnsiCallbacks, AnsiTerminalHandle } from '../src/AnsiController'
import type { RGBColor } from '../src/screenTypes'
import { ANSI_ROWS, ANSI_COLS, DEFAULT_FG } from '../src/screenTypes'
import type { TimingInfo } from '@lua-learning/canvas-runtime'

let capturedOnFrame: ((timing: TimingInfo) => void) | null = null

vi.mock('@lua-learning/canvas-runtime', () => ({
  InputCapture: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
    this.dispose = vi.fn()
    this.update = vi.fn()
  }),
  GameLoopController: vi.fn().mockImplementation(function (this: Record<string, unknown>, onFrame: (timing: TimingInfo) => void) {
    capturedOnFrame = onFrame
    this.start = vi.fn()
    this.stop = vi.fn()
    this.dispose = vi.fn()
  }),
}))

function makeV4WithTwoScenes(): Record<string, unknown> {
  const grid1: Record<number, Record<number, { char: string; fg: RGBColor; bg: RGBColor }>> = {}
  const grid2: Record<number, Record<number, { char: string; fg: RGBColor; bg: RGBColor }>> = {}
  for (let r = 0; r < ANSI_ROWS; r++) {
    const row1: Record<number, { char: string; fg: RGBColor; bg: RGBColor }> = {}
    const row2: Record<number, { char: string; fg: RGBColor; bg: RGBColor }> = {}
    for (let c = 0; c < ANSI_COLS; c++) {
      row1[c + 1] = { char: ' ', fg: [...DEFAULT_FG] as RGBColor, bg: [255, 0, 0] } // red bg
      row2[c + 1] = { char: ' ', fg: [...DEFAULT_FG] as RGBColor, bg: [0, 0, 255] } // blue bg
    }
    grid1[r + 1] = row1
    grid2[r + 1] = row2
  }
  return {
    version: 4, width: ANSI_COLS, height: ANSI_ROWS,
    layers: [
      { id: 'scene1', name: 'Scene 1', type: 'drawn', visible: true,
        grid: grid1, frames: [grid1] },
      { id: 'scene2', name: 'Scene 2', type: 'drawn', visible: false,
        grid: grid2, frames: [grid2] },
    ],
  }
}

function makeTiming(deltaTime = 0.016, totalTime = 0): TimingInfo {
  return { deltaTime, totalTime, frameNumber: 0 }
}

describe('AnsiController swipe transitions', () => {
  let controller: AnsiController
  let writeFn: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    capturedOnFrame = null
    writeFn = vi.fn()
    const callbacks: AnsiCallbacks = {
      onRequestAnsiTab: vi.fn().mockResolvedValue({
        write: writeFn,
        container: { getBoundingClientRect: () => ({ width: 0, height: 0 }) },
        dispose: vi.fn(),
      } as unknown as AnsiTerminalHandle),
      onCloseAnsiTab: vi.fn(),
    }
    controller = new AnsiController(callbacks)
    const startPromise = controller.start()
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(capturedOnFrame).not.toBeNull()
    writeFn.mockClear()
    void startPromise
  })

  describe('screenSwipeOut', () => {
    it('sets swipe state on screen', () => {
      const id = controller.createScreen(makeV4WithTwoScenes())
      controller.setScreen(id)
      capturedOnFrame!(makeTiming())
      controller.screenSwipeOut(id, 1, [0, 0, 0], ' ', 'right')
      expect(controller.screenIsSwiping(id)).toBe(true)
    })

    it('throws for unknown screen ID', () => {
      expect(() => controller.screenSwipeOut(999, 1, [0, 0, 0], ' ', 'right')).toThrow('Screen ID 999')
    })

    it('throws for duration <= 0', () => {
      const id = controller.createScreen(makeV4WithTwoScenes())
      expect(() => controller.screenSwipeOut(id, 0, [0, 0, 0], ' ', 'right')).toThrow('positive')
    })

    it('writes to terminal on first frame using formatCell pattern', () => {
      const id = controller.createScreen(makeV4WithTwoScenes())
      controller.setScreen(id)
      capturedOnFrame!(makeTiming())
      writeFn.mockClear()

      controller.screenSwipeOut(id, 1, [0, 0, 0], ' ', 'right')
      capturedOnFrame!(makeTiming(0.016, 0.016))

      expect(writeFn).toHaveBeenCalled()
      const output = writeFn.mock.calls.map((c: unknown[]) => c[0]).join('')
      // Should contain the reset-after-every-cell pattern
      expect(output).toContain('\x1b[0m')
    })

    it('completes after duration elapses', () => {
      const id = controller.createScreen(makeV4WithTwoScenes())
      controller.setScreen(id)
      capturedOnFrame!(makeTiming())

      controller.screenSwipeOut(id, 0.5, [0, 0, 0], ' ', 'right')

      capturedOnFrame!(makeTiming(0.3, 0.3))
      expect(controller.screenIsSwiping(id)).toBe(true)

      capturedOnFrame!(makeTiming(0.3, 0.6))
      expect(controller.screenIsSwiping(id)).toBe(false)
    })
  })

  describe('screenSwipeIn', () => {
    it('composites preview with specified layers visible', () => {
      const id = controller.createScreen(makeV4WithTwoScenes())
      controller.setScreen(id)
      capturedOnFrame!(makeTiming())
      writeFn.mockClear()

      // Scene2 is hidden. Swipe in should preview it as visible.
      controller.screenSwipeIn(id, 'scene2', 1, 'right')
      expect(controller.screenIsSwiping(id)).toBe(true)

      // Advance one frame
      capturedOnFrame!(makeTiming(0.5, 0.5))

      // Should have written something (the swipe)
      expect(writeFn).toHaveBeenCalled()
      const output = writeFn.mock.calls.map((c: unknown[]) => c[0]).join('')
      // The blue scene2 color should appear in the output (swiped in from left)
      expect(output).toContain('0;0;255')
    })

    it('does not permanently change layer visibility', () => {
      const id = controller.createScreen(makeV4WithTwoScenes())
      controller.setScreen(id)
      capturedOnFrame!(makeTiming())

      controller.screenSwipeIn(id, 'scene2', 1, 'right')

      // scene2 should still be hidden
      const layers = controller.getScreenLayers(id)
      const scene2 = layers.find(l => l.id === 'scene2')
      expect(scene2?.visible).toBe(false)
    })

    it('throws for unknown layer identifier', () => {
      const id = controller.createScreen(makeV4WithTwoScenes())
      expect(() => controller.screenSwipeIn(id, 'nonexistent', 1, 'right')).toThrow('No layers match')
    })

    it('accepts multiple layer identifiers separated by \\x1F', () => {
      const id = controller.createScreen(makeV4WithTwoScenes())
      controller.setScreen(id)
      capturedOnFrame!(makeTiming())

      // Both scene1 and scene2 resolved via \x1F-separated string
      controller.screenSwipeIn(id, 'scene1\x1Fscene2', 1, 'right')
      expect(controller.screenIsSwiping(id)).toBe(true)
    })

    it('deduplicates layers when same identifier appears twice', () => {
      const id = controller.createScreen(makeV4WithTwoScenes())
      controller.setScreen(id)
      capturedOnFrame!(makeTiming())

      // Same identifier twice — should not error
      controller.screenSwipeIn(id, 'scene1\x1Fscene1', 1, 'right')
      expect(controller.screenIsSwiping(id)).toBe(true)
    })

    it('commits all specified layers on completion', () => {
      const id = controller.createScreen(makeV4WithTwoScenes())
      controller.setScreen(id)
      capturedOnFrame!(makeTiming())

      // Both start hidden for this test
      controller.setScreenLayerVisible(id, 'scene1', false)
      capturedOnFrame!(makeTiming(0.016, 0.016))

      controller.screenSwipeIn(id, 'scene1\x1Fscene2', 0.01, 'right')
      capturedOnFrame!(makeTiming(0.1, 0.1))

      const layers = controller.getScreenLayers(id)
      expect(layers.find(l => l.id === 'scene1')?.visible).toBe(true)
      expect(layers.find(l => l.id === 'scene2')?.visible).toBe(true)
    })

    it('permanently toggles layers visible after completion', () => {
      const id = controller.createScreen(makeV4WithTwoScenes())
      controller.setScreen(id)
      capturedOnFrame!(makeTiming())

      // scene2 starts hidden
      expect(controller.getScreenLayers(id).find(l => l.id === 'scene2')?.visible).toBe(false)

      controller.screenSwipeIn(id, 'scene2', 0.1, 'right')
      capturedOnFrame!(makeTiming(0.2, 0.2)) // completes

      // scene2 should now be permanently visible
      expect(controller.getScreenLayers(id).find(l => l.id === 'scene2')?.visible).toBe(true)
    })
  })

  describe('screenSwipeOut completion', () => {
    it('fill stays on screen (no snap-back to scene)', () => {
      const id = controller.createScreen(makeV4WithTwoScenes())
      controller.setScreen(id)
      capturedOnFrame!(makeTiming())
      writeFn.mockClear()

      controller.screenSwipeOut(id, 0.1, [0, 0, 0], ' ', 'right')
      capturedOnFrame!(makeTiming(0.2, 0.2)) // completes

      // After completion, another frame should NOT write (fill stays)
      writeFn.mockClear()
      capturedOnFrame!(makeTiming(0.016, 0.216))
      expect(writeFn).not.toHaveBeenCalled()
    })
  })

  describe('screenSwipeOutLayers', () => {
    it('sets swipe state on screen', () => {
      const id = controller.createScreen(makeV4WithTwoScenes())
      controller.setScreen(id)
      capturedOnFrame!(makeTiming())
      controller.screenSwipeOutLayers(id, 'scene1', 1, 'right')
      expect(controller.screenIsSwiping(id)).toBe(true)
    })

    it('throws for unknown layer identifier', () => {
      const id = controller.createScreen(makeV4WithTwoScenes())
      expect(() => controller.screenSwipeOutLayers(id, 'nonexistent', 1, 'right')).toThrow('No layers match')
    })

    it('throws for duration <= 0', () => {
      const id = controller.createScreen(makeV4WithTwoScenes())
      expect(() => controller.screenSwipeOutLayers(id, 'scene1', 0, 'right')).toThrow('positive')
    })

    it('does not change visibility during transition', () => {
      const id = controller.createScreen(makeV4WithTwoScenes())
      controller.setScreen(id)
      capturedOnFrame!(makeTiming())

      // scene1 starts visible
      expect(controller.getScreenLayers(id).find(l => l.id === 'scene1')?.visible).toBe(true)

      controller.screenSwipeOutLayers(id, 'scene1', 1, 'right')

      // scene1 should still be visible during transition
      expect(controller.getScreenLayers(id).find(l => l.id === 'scene1')?.visible).toBe(true)
    })

    it('hides layers on completion', () => {
      const id = controller.createScreen(makeV4WithTwoScenes())
      controller.setScreen(id)
      capturedOnFrame!(makeTiming())

      // scene1 starts visible
      expect(controller.getScreenLayers(id).find(l => l.id === 'scene1')?.visible).toBe(true)

      controller.screenSwipeOutLayers(id, 'scene1', 0.1, 'right')
      capturedOnFrame!(makeTiming(0.2, 0.2)) // completes

      // scene1 should now be hidden
      expect(controller.getScreenLayers(id).find(l => l.id === 'scene1')?.visible).toBe(false)
    })

    it('accepts multiple layer identifiers separated by \\x1F', () => {
      const id = controller.createScreen(makeV4WithTwoScenes())
      controller.setScreen(id)
      capturedOnFrame!(makeTiming())

      // Make scene2 visible so we can hide both
      controller.setScreenLayerVisible(id, 'scene2', true)
      capturedOnFrame!(makeTiming(0.016, 0.016))

      controller.screenSwipeOutLayers(id, 'scene1\x1Fscene2', 0.01, 'right')
      capturedOnFrame!(makeTiming(0.1, 0.1))

      const layers = controller.getScreenLayers(id)
      expect(layers.find(l => l.id === 'scene1')?.visible).toBe(false)
      expect(layers.find(l => l.id === 'scene2')?.visible).toBe(false)
    })

    it('deduplicates layers', () => {
      const id = controller.createScreen(makeV4WithTwoScenes())
      controller.setScreen(id)
      capturedOnFrame!(makeTiming())

      controller.screenSwipeOutLayers(id, 'scene1\x1Fscene1', 1, 'right')
      expect(controller.screenIsSwiping(id)).toBe(true)
    })
  })

  describe('screenDitherOutLayers', () => {
    it('sets swipe state on screen', () => {
      const id = controller.createScreen(makeV4WithTwoScenes())
      controller.setScreen(id)
      capturedOnFrame!(makeTiming())
      controller.screenDitherOutLayers(id, 'scene1', 1, 42)
      expect(controller.screenIsSwiping(id)).toBe(true)
    })

    it('throws for unknown layer identifier', () => {
      const id = controller.createScreen(makeV4WithTwoScenes())
      expect(() => controller.screenDitherOutLayers(id, 'nonexistent', 1, 42)).toThrow('No layers match')
    })

    it('throws for duration <= 0', () => {
      const id = controller.createScreen(makeV4WithTwoScenes())
      expect(() => controller.screenDitherOutLayers(id, 'scene1', 0, 42)).toThrow('positive')
    })

    it('does not change visibility during transition', () => {
      const id = controller.createScreen(makeV4WithTwoScenes())
      controller.setScreen(id)
      capturedOnFrame!(makeTiming())

      expect(controller.getScreenLayers(id).find(l => l.id === 'scene1')?.visible).toBe(true)

      controller.screenDitherOutLayers(id, 'scene1', 1, 42)

      expect(controller.getScreenLayers(id).find(l => l.id === 'scene1')?.visible).toBe(true)
    })

    it('hides layers on completion', () => {
      const id = controller.createScreen(makeV4WithTwoScenes())
      controller.setScreen(id)
      capturedOnFrame!(makeTiming())

      expect(controller.getScreenLayers(id).find(l => l.id === 'scene1')?.visible).toBe(true)

      controller.screenDitherOutLayers(id, 'scene1', 0.1, 42)
      capturedOnFrame!(makeTiming(0.2, 0.2)) // completes

      expect(controller.getScreenLayers(id).find(l => l.id === 'scene1')?.visible).toBe(false)
    })

    it('accepts multiple layer identifiers separated by \\x1F', () => {
      const id = controller.createScreen(makeV4WithTwoScenes())
      controller.setScreen(id)
      capturedOnFrame!(makeTiming())

      controller.setScreenLayerVisible(id, 'scene2', true)
      capturedOnFrame!(makeTiming(0.016, 0.016))

      controller.screenDitherOutLayers(id, 'scene1\x1Fscene2', 0.01, 42)
      capturedOnFrame!(makeTiming(0.1, 0.1))

      const layers = controller.getScreenLayers(id)
      expect(layers.find(l => l.id === 'scene1')?.visible).toBe(false)
      expect(layers.find(l => l.id === 'scene2')?.visible).toBe(false)
    })

    it('deduplicates layers', () => {
      const id = controller.createScreen(makeV4WithTwoScenes())
      controller.setScreen(id)
      capturedOnFrame!(makeTiming())

      controller.screenDitherOutLayers(id, 'scene1\x1Fscene1', 1, 42)
      expect(controller.screenIsSwiping(id)).toBe(true)
    })
  })

  describe('screenIsSwiping', () => {
    it('returns false when no swipe is active', () => {
      const id = controller.createScreen(makeV4WithTwoScenes())
      expect(controller.screenIsSwiping(id)).toBe(false)
    })
  })
})
