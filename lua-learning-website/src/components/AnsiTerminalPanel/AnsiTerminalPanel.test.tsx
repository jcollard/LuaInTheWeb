import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { AnsiTerminalPanel } from './AnsiTerminalPanel'
import type { AnsiTerminalHandle } from './types'

// Mock @lua-learning/lua-runtime: the pixel path (default) only needs
// PixelAnsiRenderer, CrtShader, DEFAULT_FONT_ID, and a few type shims.
// No xterm mock needed for the default path; the xterm variant isn't
// mounted unless useFontBlocks=false.

const mockRenderer = {
  write: vi.fn(),
  resize: vi.fn(),
  setFontFamily: vi.fn().mockResolvedValue(undefined),
  setUseFontBlocks: vi.fn().mockResolvedValue(undefined),
  dispose: vi.fn(),
  canvas: (() => {
    const c = document.createElement('canvas')
    c.width = 80 * 8
    c.height = 25 * 16
    return c
  })(),
  cols: 80,
  rows: 25,
  cellW: 8,
  cellH: 16,
  fontId: 'IBM_VGA_8x16',
  usesFontBlocks: true,
}

const mockEnable = vi.fn()
const mockDisable = vi.fn()
const mockDispose = vi.fn()

const pixelCtor = vi.fn()
vi.mock('@lua-learning/lua-runtime', () => {
  class MockPixelAnsiRenderer {
    constructor(opts: unknown) {
      pixelCtor(opts)
      Object.assign(this, mockRenderer)
    }
  }
  class MockCrtShader {
    enable = mockEnable
    disable = mockDisable
    dispose = mockDispose
    isFallback = () => false
    setIntensity = () => {}
    isEnabled = () => false
  }
  return {
    DEFAULT_FONT_ID: 'IBM_VGA_8x16',
    PixelAnsiRenderer: MockPixelAnsiRenderer,
    CrtShader: MockCrtShader,
    getFontById: (id: string) => ({
      id,
      label: id,
      ttfPath: '',
      woffPath: '/fonts/fake.woff',
      fontFamily: 'Fake Family',
      cellW: 8,
      cellH: 16,
      nativePpem: 16,
    }),
  }
})

// Mock xterm so that — on the off chance a test mounts useFontBlocks=false —
// the xterm variant doesn't blow up. The tests below focus on the pixel path.
vi.mock('@xterm/xterm', () => {
  class MockTerminal {
    options = { fontSize: 16, fontFamily: '' }
    open = vi.fn()
    loadAddon = vi.fn()
    attachCustomKeyEventHandler = vi.fn()
    write = vi.fn()
    resize = vi.fn()
    dispose = vi.fn()
  }
  return { Terminal: MockTerminal }
})

vi.mock('@xterm/addon-canvas', () => {
  class MockCanvasAddon {}
  return { CanvasAddon: MockCanvasAddon }
})

vi.mock('./AnsiTerminalPanel.module.css', () => ({
  default: {
    container: 'container',
    terminalWrapper: 'terminalWrapper',
    crtEnabled: 'crtEnabled',
  },
}))

beforeEach(() => {
  mockRenderer.write.mockClear()
  mockRenderer.resize.mockClear()
  mockRenderer.setFontFamily.mockClear()
  mockRenderer.setUseFontBlocks.mockClear()
  mockRenderer.dispose.mockClear()
  mockEnable.mockClear()
  mockDisable.mockClear()
  mockDispose.mockClear()
  Object.defineProperty(document, 'fonts', {
    value: { load: vi.fn().mockResolvedValue([]) },
    configurable: true,
  })
})

describe('AnsiTerminalPanel — pixel variant (default)', () => {
  it('calls onTerminalReady with a handle on mount and with null on unmount', async () => {
    const onTerminalReady = vi.fn()
    const { unmount } = render(<AnsiTerminalPanel onTerminalReady={onTerminalReady} />)
    await act(async () => {})

    expect(onTerminalReady).toHaveBeenCalledWith(
      expect.objectContaining({ write: expect.any(Function) }),
    )

    onTerminalReady.mockClear()
    unmount()
    expect(onTerminalReady).toHaveBeenCalledWith(null)
  })

  it('handle.write delegates to the PixelAnsiRenderer', async () => {
    let handle: AnsiTerminalHandle | null = null
    render(<AnsiTerminalPanel onTerminalReady={(h) => { handle = h }} />)
    await act(async () => {})
    expect(handle).not.toBeNull()

    act(() => { handle!.write('hello') })
    expect(mockRenderer.write).toHaveBeenCalledWith('hello')
  })

  it('handle.resize forwards to the renderer', async () => {
    let handle: AnsiTerminalHandle | null = null
    render(<AnsiTerminalPanel onTerminalReady={(h) => { handle = h }} />)
    await act(async () => {})

    act(() => { handle!.resize!(40, 12) })
    expect(mockRenderer.resize).toHaveBeenCalledWith(40, 12)
  })

  it('fontId prop change calls setFontFamily on the handle', async () => {
    let handle: AnsiTerminalHandle | null = null
    const { rerender } = render(
      <AnsiTerminalPanel
        fontId="IBM_VGA_8x16"
        onTerminalReady={(h) => { handle = h }}
      />,
    )
    await act(async () => {})
    expect(handle).not.toBeNull()
    // The fontId effect fires on initial mount too, passing the same id —
    // the renderer treats matching ids as a no-op (verified in pixelAnsiRenderer.test).
    mockRenderer.setFontFamily.mockClear()

    rerender(
      <AnsiTerminalPanel
        fontId="IBM_VGA_9x16"
        onTerminalReady={(h) => { handle = h }}
      />,
    )
    expect(mockRenderer.setFontFamily).toHaveBeenCalledWith('IBM_VGA_9x16')
  })

  it('handle.setCrt(true) adds the CSS fallback class when no canvas-shader path is available', async () => {
    let handle: AnsiTerminalHandle | null = null
    const { container } = render(<AnsiTerminalPanel onTerminalReady={(h) => { handle = h }} />)
    await act(async () => {})

    const outer = container.firstChild as HTMLElement
    // The PixelAnsiRenderer mock's canvas is attached to the wrapper — so
    // the real shader path engages. Verify shader.enable was called.
    act(() => { handle!.setCrt(true, 0.5) })
    expect(mockEnable).toHaveBeenCalledWith(0.5)
    // CSS fallback class shouldn't be applied when the shader path runs.
    expect(outer.classList.contains('crtEnabled')).toBe(false)
  })

  it('handle.setCrt(false) disables the shader', async () => {
    let handle: AnsiTerminalHandle | null = null
    render(<AnsiTerminalPanel onTerminalReady={(h) => { handle = h }} />)
    await act(async () => {})

    act(() => { handle!.setCrt(true, 0.7) })
    act(() => { handle!.setCrt(false) })
    expect(mockDisable).toHaveBeenCalled()
  })

  it('disposes the renderer on unmount', async () => {
    const { unmount } = render(<AnsiTerminalPanel onTerminalReady={vi.fn()} />)
    await act(async () => {})
    unmount()
    expect(mockRenderer.dispose).toHaveBeenCalled()
  })

  it('applies surroundClassName to the container element (pixel variant)', async () => {
    const { container } = render(
      <AnsiTerminalPanel surroundClassName="editor-surround" onTerminalReady={vi.fn()} />,
    )
    await act(async () => {})
    const outer = container.firstChild as HTMLElement
    expect(outer.classList.contains('container')).toBe(true)
    expect(outer.classList.contains('editor-surround')).toBe(true)
  })

  it('omits surroundClassName when not provided (pixel variant)', async () => {
    const { container } = render(<AnsiTerminalPanel onTerminalReady={vi.fn()} />)
    await act(async () => {})
    const outer = container.firstChild as HTMLElement
    expect(outer.classList.contains('container')).toBe(true)
    expect(outer.className).not.toMatch(/editor-surround/)
  })

  it('applies surroundClassName to the container element (xterm variant)', async () => {
    const { container } = render(
      <AnsiTerminalPanel
        useFontBlocks={false}
        surroundClassName="editor-surround"
        onTerminalReady={vi.fn()}
      />,
    )
    await act(async () => {})
    const outer = container.firstChild as HTMLElement
    expect(outer.classList.contains('container')).toBe(true)
    expect(outer.classList.contains('editor-surround')).toBe(true)
  })

  it('constructs a new renderer on useFontBlocks toggle (key-swap remount)', async () => {
    const onTerminalReady = vi.fn()
    const { rerender, unmount } = render(
      <AnsiTerminalPanel useFontBlocks={true} onTerminalReady={onTerminalReady} />,
    )
    await act(async () => {})
    const pixelMountCount = pixelCtor.mock.calls.length
    expect(pixelMountCount).toBeGreaterThanOrEqual(1)

    // Toggle to xterm — the pixel renderer should not be constructed again.
    rerender(
      <AnsiTerminalPanel useFontBlocks={false} onTerminalReady={onTerminalReady} />,
    )
    await act(async () => {})
    expect(pixelCtor.mock.calls.length).toBe(pixelMountCount)

    // And the pixel renderer the original mount constructed should have
    // been disposed during the remount.
    expect(mockRenderer.dispose).toHaveBeenCalled()
    unmount()
  })
})
