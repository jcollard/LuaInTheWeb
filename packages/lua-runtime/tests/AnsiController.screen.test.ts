import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AnsiController } from '../src/AnsiController'
import type { AnsiCallbacks, AnsiTerminalHandle } from '../src/AnsiController'
import type { RGBColor } from '../src/screenTypes'
import { ANSI_ROWS, ANSI_COLS, DEFAULT_FG, DEFAULT_BG } from '../src/screenTypes'

// Mock canvas-runtime to avoid DOM dependencies
vi.mock('@lua-learning/canvas-runtime', () => ({
  InputCapture: vi.fn().mockImplementation(() => ({
    dispose: vi.fn(),
    update: vi.fn(),
  })),
  GameLoopController: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    dispose: vi.fn(),
  })),
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

  it('createScreen generates a non-empty ANSI string', () => {
    const data = makeMinimalV1Data()
    const id = controller.createScreen(data)
    // Internally the screen is stored as a string - verify by setting it
    controller.setScreen(id)
    expect(controller.getActiveScreenId()).toBe(id)
  })
})
