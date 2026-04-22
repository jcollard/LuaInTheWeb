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

function makeV1Data(overrides?: Partial<Record<string, unknown>>): Record<string, unknown> {
  const grid: Record<number, Record<number, { char: string; fg: RGBColor; bg: RGBColor }>> = {}
  for (let r = 0; r < ANSI_ROWS; r++) {
    const row: Record<number, { char: string; fg: RGBColor; bg: RGBColor }> = {}
    for (let c = 0; c < ANSI_COLS; c++) {
      row[c + 1] = { char: ' ', fg: [...DEFAULT_FG] as RGBColor, bg: [...DEFAULT_BG] as RGBColor }
    }
    grid[r + 1] = row
  }
  return { version: 1, width: ANSI_COLS, height: ANSI_ROWS, grid, ...overrides }
}

interface MockHandle {
  setFontFamily: ReturnType<typeof vi.fn>
  setUseFontBlocks: ReturnType<typeof vi.fn>
  write: ReturnType<typeof vi.fn>
  dispose: ReturnType<typeof vi.fn>
  container: { getBoundingClientRect: () => { width: number; height: number } }
  resize: ReturnType<typeof vi.fn>
}

async function bootController(): Promise<{ controller: AnsiController; handle: MockHandle }> {
  const handle: MockHandle = {
    setFontFamily: vi.fn(),
    setUseFontBlocks: vi.fn(),
    write: vi.fn(),
    dispose: vi.fn(),
    container: { getBoundingClientRect: () => ({ width: 0, height: 0 }) },
    resize: vi.fn(),
  }
  const callbacks: AnsiCallbacks = {
    onRequestAnsiTab: vi.fn().mockResolvedValue(handle as unknown as AnsiTerminalHandle),
    onCloseAnsiTab: vi.fn(),
  }
  const controller = new AnsiController(callbacks)
  void controller.start()
  await new Promise(resolve => setTimeout(resolve, 0))
  return { controller, handle }
}

describe('AnsiController per-screen font settings', () => {
  let controller: AnsiController
  let handle: MockHandle

  beforeEach(async () => {
    ;({ controller, handle } = await bootController())
    // Clear any calls that fired during start() / setup.
    handle.setFontFamily.mockClear()
    handle.setUseFontBlocks.mockClear()
  })

  it('does not fire handle font callbacks when the screen uses defaults', () => {
    const id = controller.createScreen(makeV1Data())
    controller.setScreen(id)
    expect(handle.setFontFamily).not.toHaveBeenCalled()
    expect(handle.setUseFontBlocks).not.toHaveBeenCalled()
  })

  it('forwards non-default font via handle.setFontFamily on setScreen', () => {
    const id = controller.createScreen(makeV1Data({ font: 'IBM_VGA_9x16' }))
    controller.setScreen(id)
    expect(handle.setFontFamily).toHaveBeenCalledTimes(1)
    expect(handle.setFontFamily).toHaveBeenCalledWith('IBM_VGA_9x16')
  })

  it('forwards non-default useFontBlocks via handle.setUseFontBlocks on setScreen', () => {
    const id = controller.createScreen(makeV1Data({ useFontBlocks: false }))
    controller.setScreen(id)
    expect(handle.setUseFontBlocks).toHaveBeenCalledTimes(1)
    expect(handle.setUseFontBlocks).toHaveBeenCalledWith(false)
  })

  it('only fires on change — re-activating the same screen is a no-op', () => {
    const id = controller.createScreen(makeV1Data({ font: 'IBM_VGA_9x16', useFontBlocks: false }))
    controller.setScreen(id)
    expect(handle.setFontFamily).toHaveBeenCalledTimes(1)
    expect(handle.setUseFontBlocks).toHaveBeenCalledTimes(1)

    // Setting the same screen again — nothing new to apply.
    controller.setScreen(id)
    expect(handle.setFontFamily).toHaveBeenCalledTimes(1)
    expect(handle.setUseFontBlocks).toHaveBeenCalledTimes(1)
  })

  it('diffs correctly when switching between screens with different settings', () => {
    const cgaId = controller.createScreen(makeV1Data({ font: 'IBM_CGA_8x8' }))
    const vga9Id = controller.createScreen(makeV1Data({ font: 'IBM_VGA_9x16', useFontBlocks: false }))

    controller.setScreen(cgaId)
    expect(handle.setFontFamily).toHaveBeenLastCalledWith('IBM_CGA_8x8')
    expect(handle.setUseFontBlocks).not.toHaveBeenCalled() // still default

    controller.setScreen(vga9Id)
    expect(handle.setFontFamily).toHaveBeenLastCalledWith('IBM_VGA_9x16')
    expect(handle.setUseFontBlocks).toHaveBeenLastCalledWith(false)

    // Switching back to CGA — font should change back, useFontBlocks back to default true.
    controller.setScreen(cgaId)
    expect(handle.setFontFamily).toHaveBeenLastCalledWith('IBM_CGA_8x8')
    expect(handle.setUseFontBlocks).toHaveBeenLastCalledWith(true)
  })
})
