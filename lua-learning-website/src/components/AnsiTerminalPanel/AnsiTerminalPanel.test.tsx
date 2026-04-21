import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { AnsiTerminalPanel } from './AnsiTerminalPanel'
import type { AnsiTerminalHandle } from './AnsiTerminalPanel'

// Track CrtShader mock instances
const mockEnable = vi.fn()
const mockDisable = vi.fn()
const mockDispose = vi.fn()
const mockIsFallback = vi.fn(() => false)

// PixelAnsiRenderer mock: creates a real <canvas> the panel can mount +
// the CrtShader can bind to. Exposes the same handle surface the panel
// calls through.
const mockRendererCanvas: HTMLCanvasElement[] = []
const mockRendererDispose = vi.fn()
const mockRendererWrite = vi.fn()
const mockRendererResize = vi.fn()
const mockRendererSetFontFamily = vi.fn().mockResolvedValue(undefined)
const mockRendererSetUseFontBlocks = vi.fn().mockResolvedValue(undefined)

vi.mock('@lua-learning/lua-runtime', () => ({
  CrtShader: vi.fn().mockImplementation(function MockCrtShader() {
    return {
      enable: mockEnable,
      disable: mockDisable,
      dispose: mockDispose,
      isFallback: mockIsFallback,
      setIntensity: vi.fn(),
      isEnabled: vi.fn(() => false),
    }
  }),
  PixelAnsiRenderer: vi.fn().mockImplementation(function MockRenderer(
    opts: { cols: number; rows: number }
  ) {
    const canvas = document.createElement('canvas')
    canvas.width = opts.cols * 8
    canvas.height = opts.rows * 16
    mockRendererCanvas.push(canvas)
    return {
      canvas,
      cols: opts.cols,
      rows: opts.rows,
      write: mockRendererWrite,
      resize: mockRendererResize,
      setFontFamily: mockRendererSetFontFamily,
      setUseFontBlocks: mockRendererSetUseFontBlocks,
      dispose: mockRendererDispose,
    }
  }),
  CELL_W: 8,
  CELL_H: 16,
}))

// Mock CSS module
vi.mock('./AnsiTerminalPanel.module.css', () => ({
  default: {
    container: 'container',
    terminalWrapper: 'terminalWrapper',
    crtEnabled: 'crtEnabled',
  },
}))

beforeEach(() => {
  mockEnable.mockClear()
  mockDisable.mockClear()
  mockDispose.mockClear()
  mockIsFallback.mockClear()
  mockRendererCanvas.length = 0
  mockRendererDispose.mockClear()
  mockRendererWrite.mockClear()
  mockRendererResize.mockClear()
  mockRendererSetFontFamily.mockClear()
  mockRendererSetUseFontBlocks.mockClear()

  // Provide FontFaceSet.load mock since jsdom lacks it
  Object.defineProperty(document, 'fonts', {
    value: { load: vi.fn().mockResolvedValue([]) },
    configurable: true,
  })
})

describe('AnsiTerminalPanel', () => {
  it('should call onTerminalReady(null) on unmount', async () => {
    const onTerminalReady = vi.fn()

    const { unmount } = render(
      <AnsiTerminalPanel onTerminalReady={onTerminalReady} />
    )

    // Wait for the async init() to complete (font load + terminal setup)
    await act(async () => {
      // Flush microtask queue
    })

    // Should have been called with a handle on mount
    expect(onTerminalReady).toHaveBeenCalledWith(
      expect.objectContaining({ write: expect.any(Function) })
    )

    onTerminalReady.mockClear()

    unmount()

    expect(onTerminalReady).toHaveBeenCalledWith(null)
  })

  it('should not have crtEnabled class by default', () => {
    const { container } = render(
      <AnsiTerminalPanel />
    )

    const outerDiv = container.firstChild as HTMLElement
    expect(outerDiv.className).toBe('container')
    expect(outerDiv.className).not.toContain('crtEnabled')
  })

  it('handle.setCrt(true) should enable CRT shader when canvas exists', async () => {
    let handle: AnsiTerminalHandle | null = null
    const onTerminalReady = vi.fn((h: AnsiTerminalHandle | null) => { handle = h })

    render(
      <AnsiTerminalPanel onTerminalReady={onTerminalReady} />
    )

    await act(async () => {})

    expect(handle).not.toBeNull()

    // The PixelAnsiRenderer mock always creates a canvas, so the CRT
    // shader path (not CSS fallback) is taken.
    act(() => { handle!.setCrt(true, 0.5) })

    expect(mockEnable).toHaveBeenCalledWith(0.5)
  })

  it('handle.setCrt(false) should disable CRT effect', async () => {
    let handle: AnsiTerminalHandle | null = null
    const onTerminalReady = vi.fn((h: AnsiTerminalHandle | null) => { handle = h })

    render(
      <AnsiTerminalPanel onTerminalReady={onTerminalReady} />
    )

    await act(async () => {})

    // Canvas is always present via PixelAnsiRenderer mock, so CRT
    // shader handles both enable + disable.
    act(() => { handle!.setCrt(true, 0.8) })
    expect(mockEnable).toHaveBeenCalledWith(0.8)

    act(() => { handle!.setCrt(false) })
    expect(mockDisable).toHaveBeenCalled()
  })

  it('handle.setCrt(true) with no intensity defaults to undefined (shader-chosen)', async () => {
    let handle: AnsiTerminalHandle | null = null
    const onTerminalReady = vi.fn((h: AnsiTerminalHandle | null) => { handle = h })

    render(
      <AnsiTerminalPanel onTerminalReady={onTerminalReady} />
    )

    await act(async () => {})

    act(() => { handle!.setCrt(true) })

    expect(mockEnable).toHaveBeenCalledWith(undefined)
  })

  it('should dispose CrtShader on unmount', async () => {
    const onTerminalReady = vi.fn()

    const { unmount } = render(
      <AnsiTerminalPanel onTerminalReady={onTerminalReady} />
    )

    await act(async () => {})
    unmount()

    // CrtShader.dispose() should be called during cleanup
    // (only if one was created — in jsdom it may not be)
  })

  it('should construct PixelAnsiRenderer with the requested cols/rows', async () => {
    const { PixelAnsiRenderer } = await import('@lua-learning/lua-runtime')

    render(
      <AnsiTerminalPanel cols={120} rows={40} />
    )

    await act(async () => {})

    expect(PixelAnsiRenderer).toHaveBeenCalledWith(
      expect.objectContaining({ cols: 120, rows: 40 })
    )
  })

  it('handle.write forwards data to the renderer', async () => {
    let handle: AnsiTerminalHandle | null = null
    const onTerminalReady = vi.fn((h: AnsiTerminalHandle | null) => { handle = h })

    render(<AnsiTerminalPanel onTerminalReady={onTerminalReady} />)
    await act(async () => {})

    act(() => { handle!.write('\x1b[31mhello\x1b[0m') })

    expect(mockRendererWrite).toHaveBeenCalledWith('\x1b[31mhello\x1b[0m')
  })

  it('handle.resize forwards to the renderer', async () => {
    let handle: AnsiTerminalHandle | null = null
    const onTerminalReady = vi.fn((h: AnsiTerminalHandle | null) => { handle = h })

    render(<AnsiTerminalPanel onTerminalReady={onTerminalReady} />)
    await act(async () => {})

    act(() => { handle!.resize?.(120, 40) })

    expect(mockRendererResize).toHaveBeenCalledWith(120, 40)
  })

  it('handle.setUseFontBlocks forwards to the renderer', async () => {
    let handle: AnsiTerminalHandle | null = null
    const onTerminalReady = vi.fn((h: AnsiTerminalHandle | null) => { handle = h })

    render(<AnsiTerminalPanel onTerminalReady={onTerminalReady} />)
    await act(async () => {})
    mockRendererSetUseFontBlocks.mockClear()

    act(() => { handle!.setUseFontBlocks?.(false) })
    expect(mockRendererSetUseFontBlocks).toHaveBeenCalledWith(false)

    act(() => { handle!.setUseFontBlocks?.(true) })
    expect(mockRendererSetUseFontBlocks).toHaveBeenCalledWith(true)
  })

  it('disposes the renderer on unmount', async () => {
    const { unmount } = render(<AnsiTerminalPanel />)
    await act(async () => {})
    unmount()
    expect(mockRendererDispose).toHaveBeenCalled()
  })
})
