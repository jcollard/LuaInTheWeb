import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { AnsiTerminalPanel } from './AnsiTerminalPanel'
import type { AnsiTerminalHandle } from './AnsiTerminalPanel'

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

// Mock CSS module
vi.mock('./AnsiTerminalPanel.module.css', () => ({
  default: {
    container: 'container',
    terminalWrapper: 'terminalWrapper',
    crtEnabled: 'crtEnabled',
  },
}))

beforeEach(() => {
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

  it('handle.setCrt(true) should add crtEnabled class and set --crt-intensity', async () => {
    let handle: AnsiTerminalHandle | null = null
    const onTerminalReady = vi.fn((h: AnsiTerminalHandle | null) => { handle = h })

    const { container } = render(
      <AnsiTerminalPanel onTerminalReady={onTerminalReady} />
    )

    await act(async () => {})

    expect(handle).not.toBeNull()
    const outerDiv = container.firstChild as HTMLElement

    // Enable CRT via handle
    act(() => { handle!.setCrt(true, 0.5) })

    expect(outerDiv.classList.contains('crtEnabled')).toBe(true)
    expect(outerDiv.style.getPropertyValue('--crt-intensity')).toBe('0.5')
  })

  it('handle.setCrt(false) should remove crtEnabled class', async () => {
    let handle: AnsiTerminalHandle | null = null
    const onTerminalReady = vi.fn((h: AnsiTerminalHandle | null) => { handle = h })

    const { container } = render(
      <AnsiTerminalPanel onTerminalReady={onTerminalReady} />
    )

    await act(async () => {})

    const outerDiv = container.firstChild as HTMLElement

    // Enable then disable
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

    expect(outerDiv.classList.contains('crtEnabled')).toBe(true)
    expect(outerDiv.style.getPropertyValue('--crt-intensity')).toBe('0.7')
  })
})
