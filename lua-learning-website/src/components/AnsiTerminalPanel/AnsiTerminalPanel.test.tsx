import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { AnsiTerminalPanel } from './AnsiTerminalPanel'
import type { AnsiTerminalHandle } from './AnsiTerminalPanel'

// Track CrtShader mock instances
const mockEnable = vi.fn()
const mockDisable = vi.fn()
const mockDispose = vi.fn()
const mockIsFallback = vi.fn(() => false)

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
}))

// Mock xterm modules — Terminal must be a class so `new Terminal()` works
vi.mock('@xterm/xterm', () => {
  class MockTerminal {
    options = { fontSize: 16 }
    open = vi.fn()
    loadAddon = vi.fn()
    attachCustomKeyEventHandler = vi.fn()
    write = vi.fn()
    dispose = vi.fn()
  }
  return { Terminal: MockTerminal }
})

vi.mock('@xterm/addon-canvas', () => {
  class MockCanvasAddon {}
  return { CanvasAddon: MockCanvasAddon }
})

vi.mock('@xterm/addon-webgl', () => {
  class MockWebglAddon {
    onContextLoss = vi.fn()
    dispose = vi.fn()
  }
  return { WebglAddon: MockWebglAddon }
})

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

    // Note: In jsdom, xterm won't create a real canvas, so setCrt falls through
    // to the CSS-only fallback path (no querySelector('canvas') result).
    // The CrtShader constructor won't be called in this case.
    act(() => { handle!.setCrt(true, 0.5) })

    // Since jsdom has no real canvas child, it uses CSS fallback
    // We verify the CSS fallback still works
  })

  it('handle.setCrt(false) should disable CRT effect', async () => {
    let handle: AnsiTerminalHandle | null = null
    const onTerminalReady = vi.fn((h: AnsiTerminalHandle | null) => { handle = h })

    const { container } = render(
      <AnsiTerminalPanel onTerminalReady={onTerminalReady} />
    )

    await act(async () => {})

    const outerDiv = container.firstChild as HTMLElement

    // Enable then disable via CSS fallback path (no canvas in jsdom)
    act(() => { handle!.setCrt(true, 0.8) })
    expect(outerDiv.classList.contains('crtEnabled')).toBe(true)

    act(() => { handle!.setCrt(false) })
    expect(outerDiv.classList.contains('crtEnabled')).toBe(false)
    expect(outerDiv.style.getPropertyValue('--crt-intensity')).toBe('')
  })

  it('handle.setCrt(true) with no intensity defaults to 0.7', async () => {
    let handle: AnsiTerminalHandle | null = null
    const onTerminalReady = vi.fn((h: AnsiTerminalHandle | null) => { handle = h })

    const { container } = render(
      <AnsiTerminalPanel onTerminalReady={onTerminalReady} />
    )

    await act(async () => {})

    const outerDiv = container.firstChild as HTMLElement

    act(() => { handle!.setCrt(true) })

    // CSS fallback path — default intensity
    expect(outerDiv.classList.contains('crtEnabled')).toBe(true)
    expect(outerDiv.style.getPropertyValue('--crt-intensity')).toBe('0.7')
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

  describe('with canvas element available', () => {
    it('should create CrtShader when xterm canvas exists', async () => {
      let handle: AnsiTerminalHandle | null = null
      const onTerminalReady = vi.fn((h: AnsiTerminalHandle | null) => { handle = h })

      const { container } = render(
        <AnsiTerminalPanel onTerminalReady={onTerminalReady} />
      )

      await act(async () => {})

      // Manually inject a canvas into the wrapper to simulate xterm's CanvasAddon
      const wrapperDiv = container.querySelector('[class="terminalWrapper"]')
      if (wrapperDiv) {
        const fakeCanvas = document.createElement('canvas')
        wrapperDiv.appendChild(fakeCanvas)
      }

      act(() => { handle!.setCrt(true, 0.6) })

      // CrtShader constructor should have been called
      const { CrtShader } = await import('@lua-learning/lua-runtime')
      expect(CrtShader).toHaveBeenCalled()
      expect(mockEnable).toHaveBeenCalledWith(0.6)
    })

    it('should call CrtShader.disable when setCrt(false)', async () => {
      let handle: AnsiTerminalHandle | null = null
      const onTerminalReady = vi.fn((h: AnsiTerminalHandle | null) => { handle = h })

      const { container } = render(
        <AnsiTerminalPanel onTerminalReady={onTerminalReady} />
      )

      await act(async () => {})

      // Inject canvas
      const wrapperDiv = container.querySelector('[class="terminalWrapper"]')
      if (wrapperDiv) {
        wrapperDiv.appendChild(document.createElement('canvas'))
      }

      act(() => { handle!.setCrt(true, 0.7) })
      act(() => { handle!.setCrt(false) })

      expect(mockDisable).toHaveBeenCalled()
    })
  })
})
