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

function makeV1Data(cols: number, rows: number, char: string): Record<string, unknown> {
  const grid: Record<number, Record<number, { char: string; fg: RGBColor; bg: RGBColor }>> = {}
  for (let r = 0; r < rows; r++) {
    const row: Record<number, { char: string; fg: RGBColor; bg: RGBColor }> = {}
    for (let c = 0; c < cols; c++) {
      row[c + 1] = { char: ' ', fg: [...DEFAULT_FG] as RGBColor, bg: [...DEFAULT_BG] as RGBColor }
    }
    grid[r + 1] = row
  }
  grid[1][1] = { char, fg: [255, 0, 0], bg: [0, 255, 0] }
  return { version: 1, width: cols, height: rows, grid }
}

interface HandleMocks {
  resize: ReturnType<typeof vi.fn>
  setFontFamily: ReturnType<typeof vi.fn>
  setUseFontBlocks: ReturnType<typeof vi.fn>
}

function makeHandle(): AnsiTerminalHandle & HandleMocks {
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

/** Start the controller without awaiting the blocking promise; returns a teardown. */
async function bringUp(controller: AnsiController): Promise<() => Promise<void>> {
  const blockingPromise = controller.start()
  // Yield so the onRequestAnsiTab mock's resolve fires and `this.handle` is set.
  await Promise.resolve()
  await Promise.resolve()
  return async () => { controller.stop(); await blockingPromise }
}

describe('AnsiController — terminal resize on screen load', () => {
  let handle: ReturnType<typeof makeHandle>
  let controller: AnsiController

  beforeEach(() => {
    handle = makeHandle()
    controller = new AnsiController(makeCallbacks(handle))
  })

  it('starts with default 80×25 dimensions', () => {
    expect(controller.getCols()).toBe(80)
    expect(controller.getRows()).toBe(25)
  })

  it('stores authored dimensions on createScreen without resizing yet', async () => {
    const teardown = await bringUp(controller)
    controller.createScreen(makeV1Data(120, 40, 'A'))
    expect(controller.getCols()).toBe(80)
    expect(controller.getRows()).toBe(25)
    expect(handle.resize).not.toHaveBeenCalled()
    await teardown()
  })

  it('resizes the terminal when activating a differently-sized screen', async () => {
    const teardown = await bringUp(controller)
    const id = controller.createScreen(makeV1Data(120, 40, 'A'))
    controller.setScreen(id)
    expect(controller.getCols()).toBe(120)
    expect(controller.getRows()).toBe(40)
    expect(handle.resize).toHaveBeenCalledWith(120, 40)
    await teardown()
  })

  it('resizes back when switching to a screen with smaller dimensions', async () => {
    const teardown = await bringUp(controller)
    const big = controller.createScreen(makeV1Data(120, 40, 'A'))
    const small = controller.createScreen(makeV1Data(40, 10, 'B'))
    controller.setScreen(big)
    controller.setScreen(small)
    expect(controller.getCols()).toBe(40)
    expect(controller.getRows()).toBe(10)
    expect(handle.resize).toHaveBeenLastCalledWith(40, 10)
    await teardown()
  })

  it('does not call resize when the screen matches current dimensions', async () => {
    const teardown = await bringUp(controller)
    const id = controller.createScreen(makeV1Data(80, 25, 'Z'))
    controller.setScreen(id)
    expect(handle.resize).not.toHaveBeenCalled()
    await teardown()
  })

  it('setCursor clamps to current terminal dims, not 80x25', async () => {
    const teardown = await bringUp(controller)
    const id = controller.createScreen(makeV1Data(120, 40, 'A'))
    controller.setScreen(id)
    controller.setCursor(35, 110)
    // Row 35 is within 40, col 110 is within 120 — no clamping.
    expect((handle.write as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('\x1b[35;110H')
    await teardown()
  })

  // Regression: every example program calls set_screen() before ansi.start().
  // setScreen runs resizeTerminal (which does handle?.resize) while the handle
  // is still null, so the panel never learned the new dims. start() must
  // forward the controller's accumulated dims to the freshly-attached handle.
  it('forwards pre-start setScreen dimensions to the handle once it attaches', async () => {
    const id = controller.createScreen(makeV1Data(120, 40, 'A'))
    // setScreen BEFORE bringUp — handle is still null inside resizeTerminal,
    // so the resize call must come from start() instead.
    controller.setScreen(id)
    expect(handle.resize).not.toHaveBeenCalled()
    expect(controller.getCols()).toBe(120)
    expect(controller.getRows()).toBe(40)

    const teardown = await bringUp(controller)
    expect(handle.resize).toHaveBeenCalledWith(120, 40)
    await teardown()
  })
})
