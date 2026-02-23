import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AnsiController } from '../src/AnsiController'
import type { AnsiCallbacks, AnsiTerminalHandle } from '../src/AnsiController'
import type { RGBColor } from '../src/screenTypes'
import { ANSI_ROWS, ANSI_COLS, DEFAULT_FG, DEFAULT_BG } from '../src/screenTypes'

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
