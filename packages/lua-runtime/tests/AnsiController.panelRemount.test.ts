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

function makeMockHandle(): MockHandle {
  return {
    setFontFamily: vi.fn(),
    setUseFontBlocks: vi.fn(),
    write: vi.fn(),
    dispose: vi.fn(),
    container: { getBoundingClientRect: () => ({ width: 0, height: 0 }) },
    resize: vi.fn(),
  }
}

describe('AnsiController panel remount on effective useFontBlocks change', () => {
  let controller: AnsiController
  let handle: MockHandle
  let onAnsiPanelMode: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    handle = makeMockHandle()
    onAnsiPanelMode = vi.fn()
    const callbacks: AnsiCallbacks = {
      onRequestAnsiTab: vi.fn().mockResolvedValue(handle as unknown as AnsiTerminalHandle),
      onCloseAnsiTab: vi.fn(),
      onAnsiPanelMode,
    }
    controller = new AnsiController(callbacks)
    void controller.start()
    await new Promise(resolve => setTimeout(resolve, 0))
    onAnsiPanelMode.mockClear()
  })

  it('fires onAnsiPanelMode(false) when screen has useFontBlocks=false and no override', () => {
    const id = controller.createScreen(makeV1Data({ useFontBlocks: false }))
    controller.setScreen(id)
    expect(onAnsiPanelMode).toHaveBeenLastCalledWith(false)
  })

  it('does not fire onAnsiPanelMode when screen uses the default useFontBlocks=true', () => {
    const id = controller.createScreen(makeV1Data())
    controller.setScreen(id)
    expect(onAnsiPanelMode).not.toHaveBeenCalled()
  })

  it('fires onAnsiPanelMode when project override changes the effective value', () => {
    controller.setProjectUseFontBlocksOverride(false)
    expect(onAnsiPanelMode).toHaveBeenLastCalledWith(false)
  })

  it('fires onAnsiPanelMode when runtime override is set', () => {
    controller.setRuntimeUseFontBlocksOverride(false)
    expect(onAnsiPanelMode).toHaveBeenLastCalledWith(false)
  })

  it('skips onAnsiPanelMode when project override matches existing state', () => {
    controller.setProjectUseFontBlocksOverride(true) // default already true
    expect(onAnsiPanelMode).not.toHaveBeenCalled()
  })
})

describe('AnsiController handle re-attach via registerHandleListener', () => {
  it('subscribes inside start() and re-syncs state on new handle', async () => {
    const handle1 = makeMockHandle()
    const handle2 = makeMockHandle()
    let listener: ((h: unknown) => void) | null = null
    const callbacks: AnsiCallbacks = {
      onRequestAnsiTab: vi.fn().mockResolvedValue(handle1 as unknown as AnsiTerminalHandle),
      onCloseAnsiTab: vi.fn(),
      registerHandleListener: vi.fn((cb: (h: unknown) => void) => {
        listener = cb
        return () => { listener = null }
      }),
    }
    const controller = new AnsiController(callbacks)
    void controller.start()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(callbacks.registerHandleListener).toHaveBeenCalledTimes(1)

    // Create a screen with non-default font/useFontBlocks so we can verify
    // that the new handle gets the state re-synced onto it.
    const id = controller.createScreen(makeV1Data({ font: 'IBM_VGA_9x16', useFontBlocks: false }))
    controller.setScreen(id)
    handle2.setFontFamily.mockClear()
    handle2.setUseFontBlocks.mockClear()

    // Simulate the UI delivering a new handle after a panel-variant remount.
    expect(listener).not.toBeNull()
    listener!(handle2)

    // The controller should push current state onto the new handle.
    expect(handle2.setFontFamily).toHaveBeenCalledWith('IBM_VGA_9x16')
    expect(handle2.setUseFontBlocks).toHaveBeenCalledWith(false)
  })

  it('ignores null handle (panel detach is transient, keep current handle)', async () => {
    const handle1 = makeMockHandle()
    let listener: ((h: unknown) => void) | null = null
    const callbacks: AnsiCallbacks = {
      onRequestAnsiTab: vi.fn().mockResolvedValue(handle1 as unknown as AnsiTerminalHandle),
      onCloseAnsiTab: vi.fn(),
      registerHandleListener: vi.fn((cb: (h: unknown) => void) => {
        listener = cb
        return () => { listener = null }
      }),
    }
    const controller = new AnsiController(callbacks)
    void controller.start()
    await new Promise(resolve => setTimeout(resolve, 0))

    handle1.write.mockClear()
    listener!(null)
    // After a null detach the original handle is still usable; controller
    // continues writing to it until a fresh handle arrives.
    controller.write('hello')
    expect(handle1.write).toHaveBeenCalledWith('hello')
  })
})
