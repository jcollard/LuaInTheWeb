import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AnsiController } from '../src/AnsiController'
import type { AnsiCallbacks, AnsiTerminalHandle } from '../src/AnsiController'
import type { RGBColor } from '../src/screenTypes'
import { ANSI_ROWS, ANSI_COLS, DEFAULT_FG, DEFAULT_BG } from '../src/screenTypes'
import type { TimingInfo } from '@lua-learning/canvas-runtime'

// Capture the onFrame callback so we can invoke it manually.
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

function makeMinimalV1Data(): Record<string, unknown> {
  const grid: Record<number, Record<number, { char: string; fg: RGBColor; bg: RGBColor }>> = {}
  for (let r = 0; r < ANSI_ROWS; r++) {
    const row: Record<number, { char: string; fg: RGBColor; bg: RGBColor }> = {}
    for (let c = 0; c < ANSI_COLS; c++) {
      row[c + 1] = { char: ' ', fg: [...DEFAULT_FG] as RGBColor, bg: [...DEFAULT_BG] as RGBColor }
    }
    grid[r + 1] = row
  }
  grid[1][1] = { char: 'X', fg: [255, 0, 0], bg: [0, 255, 0] }
  return { version: 1, width: ANSI_COLS, height: ANSI_ROWS, grid }
}

function makeTiming(totalTime = 0): TimingInfo {
  return { deltaTime: 0.016, totalTime, frameNumber: 0 }
}

describe('AnsiController dirty flag', () => {
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
    // start() to initialize the game loop and capture onFrame
    const startPromise = controller.start()
    await new Promise(resolve => setTimeout(resolve, 0))
    // Ensure onFrame was captured
    expect(capturedOnFrame).not.toBeNull()
    // Clear any writes from start() (e.g., clear terminal)
    writeFn.mockClear()
    // Store startPromise so we can clean up later — we'll stop in tests
    void startPromise
  })

  it('writes full screen on first frame after setScreen', () => {
    const id = controller.createScreen(makeMinimalV1Data())
    controller.setScreen(id)
    writeFn.mockClear()

    capturedOnFrame!(makeTiming())

    // Should have written the full ANSI string
    expect(writeFn).toHaveBeenCalled()
  })

  it('does NOT write on second frame when nothing changed', () => {
    const id = controller.createScreen(makeMinimalV1Data())
    controller.setScreen(id)
    writeFn.mockClear()

    // First frame — writes the dirty screen
    capturedOnFrame!(makeTiming())
    writeFn.mockClear()

    // Second frame — nothing changed, should NOT write
    capturedOnFrame!(makeTiming(0.016))

    expect(writeFn).not.toHaveBeenCalled()
  })

  it('writes again after recompositing (visibility change)', () => {
    const id = controller.createScreen(makeMinimalV1Data())
    controller.setScreen(id)

    // First frame consumes the dirty flag
    capturedOnFrame!(makeTiming())
    writeFn.mockClear()

    // Second frame — no change
    capturedOnFrame!(makeTiming(0.016))
    expect(writeFn).not.toHaveBeenCalled()

    // Trigger recomposite via visibility change
    controller.setScreenLayerVisible(id, 'v1-background', false)
    writeFn.mockClear()

    // Third frame — dirty again from recomposite
    capturedOnFrame!(makeTiming(0.032))
    expect(writeFn).toHaveBeenCalled()
  })

  it('does NOT write when no screen is active', () => {
    controller.createScreen(makeMinimalV1Data())
    // Don't call setScreen
    writeFn.mockClear()

    capturedOnFrame!(makeTiming())

    expect(writeFn).not.toHaveBeenCalled()
  })
})
