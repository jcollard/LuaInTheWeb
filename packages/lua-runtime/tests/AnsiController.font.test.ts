import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AnsiController, type AnsiCallbacks, type AnsiTerminalHandle } from '../src/AnsiController'
import { DEFAULT_BG, DEFAULT_FG, type RGBColor } from '../src/screenTypes'

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

function makeScreenData(extras: Record<string, unknown> = {}): Record<string, unknown> {
  const cols = 80
  const rows = 25
  const grid: Record<number, Record<number, { char: string; fg: RGBColor; bg: RGBColor }>> = {}
  for (let r = 0; r < rows; r++) {
    const row: Record<number, { char: string; fg: RGBColor; bg: RGBColor }> = {}
    for (let c = 0; c < cols; c++) {
      row[c + 1] = { char: ' ', fg: [...DEFAULT_FG] as RGBColor, bg: [...DEFAULT_BG] as RGBColor }
    }
    grid[r + 1] = row
  }
  return { version: 1, width: cols, height: rows, grid, ...extras }
}

function makeHandle() {
  return {
    write: vi.fn(),
    container: { getBoundingClientRect: () => ({ width: 800, height: 500 }) } as unknown as HTMLElement,
    dispose: vi.fn(),
    resize: vi.fn(),
    setFontFamily: vi.fn(),
    setUseFontBlocks: vi.fn(),
  }
}

function makeCallbacks(handle: AnsiTerminalHandle): AnsiCallbacks {
  return {
    onRequestAnsiTab: vi.fn().mockResolvedValue(handle),
    onCloseAnsiTab: vi.fn(),
  }
}

async function bringUp(controller: AnsiController): Promise<() => Promise<void>> {
  const blockingPromise = controller.start()
  await Promise.resolve()
  await Promise.resolve()
  return async () => { controller.stop(); await blockingPromise }
}

describe('AnsiController — per-screen font + useFontBlocks', () => {
  let handle: ReturnType<typeof makeHandle>
  let controller: AnsiController

  beforeEach(() => {
    handle = makeHandle()
    controller = new AnsiController(makeCallbacks(handle))
  })

  it('does not push font/glyph settings before a screen is set', async () => {
    const teardown = await bringUp(controller)
    expect(handle.setFontFamily).not.toHaveBeenCalled()
    expect(handle.setUseFontBlocks).not.toHaveBeenCalled()
    await teardown()
  })

  it('pushes useFontBlocks=false to the handle when a screen authored with the toggle off is activated', async () => {
    const teardown = await bringUp(controller)
    const id = controller.createScreen(makeScreenData({ useFontBlocks: false }))
    controller.setScreen(id)
    expect(handle.setUseFontBlocks).toHaveBeenCalledWith(false)
    await teardown()
  })

  it('does not push redundant calls when the screen matches the current settings', async () => {
    const teardown = await bringUp(controller)
    // Default screen (useFontBlocks omitted => true, which equals controller default)
    const id = controller.createScreen(makeScreenData())
    controller.setScreen(id)
    expect(handle.setUseFontBlocks).not.toHaveBeenCalled()
    expect(handle.setFontFamily).not.toHaveBeenCalled()
    await teardown()
  })

  it('flips back to the previous setting when switching screens', async () => {
    const teardown = await bringUp(controller)
    const a = controller.createScreen(makeScreenData({ useFontBlocks: false }))
    const b = controller.createScreen(makeScreenData({ useFontBlocks: true }))
    controller.setScreen(a)
    controller.setScreen(b)
    expect(handle.setUseFontBlocks).toHaveBeenNthCalledWith(1, false)
    expect(handle.setUseFontBlocks).toHaveBeenNthCalledWith(2, true)
    await teardown()
  })
})
