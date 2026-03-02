import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { AnsiTerminalPanel } from './AnsiTerminalPanel'

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
  default: { container: 'container', terminalWrapper: 'terminalWrapper' },
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
})
