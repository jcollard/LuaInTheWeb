import { describe, it, expect, vi } from 'vitest'
import { AnsiController } from '../src/AnsiController'
import type { AnsiCallbacks, AnsiTerminalHandle } from '../src/AnsiController'

function createMockHandle(): AnsiTerminalHandle {
  return {
    write: vi.fn(),
    container: {} as HTMLElement,
    dispose: vi.fn(),
    setCrt: vi.fn(),
  }
}

function createMockCallbacks(handle: AnsiTerminalHandle): AnsiCallbacks {
  return {
    onRequestAnsiTab: vi.fn().mockResolvedValue(handle),
    onCloseAnsiTab: vi.fn(),
    onError: vi.fn(),
  }
}

describe('AnsiController pending CRT', () => {
  it('should store setCrt call when handle is not yet available', () => {
    const handle = createMockHandle()
    const callbacks = createMockCallbacks(handle)
    const controller = new AnsiController(callbacks)

    controller.setCrt(true, undefined, { curvature: 0.3 })

    // Should NOT have called handle.setCrt since handle isn't assigned yet
    expect(handle.setCrt).not.toHaveBeenCalled()

    // Should have pending CRT
    const pending = controller.consumePendingCrt()
    expect(pending).toEqual({ enabled: true, intensity: undefined, config: { curvature: 0.3 } })
  })

  it('should return null from consumePendingCrt when no pending CRT', () => {
    const handle = createMockHandle()
    const callbacks = createMockCallbacks(handle)
    const controller = new AnsiController(callbacks)

    expect(controller.consumePendingCrt()).toBeNull()
  })

  it('should clear pending CRT after consumePendingCrt', () => {
    const handle = createMockHandle()
    const callbacks = createMockCallbacks(handle)
    const controller = new AnsiController(callbacks)

    controller.setCrt(true, 0.7)
    expect(controller.consumePendingCrt()).not.toBeNull()
    expect(controller.consumePendingCrt()).toBeNull()
  })

  it('should override pending CRT with latest setCrt call', () => {
    const handle = createMockHandle()
    const callbacks = createMockCallbacks(handle)
    const controller = new AnsiController(callbacks)

    controller.setCrt(true, undefined, { curvature: 0.3 })
    controller.setCrt(true, undefined, { curvature: 0.5, brightness: 1.2 })

    const pending = controller.consumePendingCrt()
    expect(pending).toEqual({
      enabled: true,
      intensity: undefined,
      config: { curvature: 0.5, brightness: 1.2 },
    })
  })

  it('should store disabled pending CRT', () => {
    const handle = createMockHandle()
    const callbacks = createMockCallbacks(handle)
    const controller = new AnsiController(callbacks)

    controller.setCrt(false)

    const pending = controller.consumePendingCrt()
    expect(pending).toEqual({ enabled: false, intensity: undefined, config: undefined })
  })
})
