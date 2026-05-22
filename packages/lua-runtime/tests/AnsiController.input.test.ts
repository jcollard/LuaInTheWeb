import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AnsiController } from '../src/AnsiController'
import { InputAPI } from '../src/InputAPI'
import type { AnsiCallbacks, AnsiTerminalHandle } from '../src/AnsiController'
import type { KeyTypedEvent } from '@lua-learning/canvas-runtime'

vi.mock('@lua-learning/canvas-runtime', () => ({
  InputCapture: vi.fn().mockImplementation(function (this: Record<string, ReturnType<typeof vi.fn>>) {
    this.dispose = vi.fn()
    this.update = vi.fn()
  }),
  GameLoopController: vi.fn().mockImplementation(function (this: Record<string, ReturnType<typeof vi.fn>>) {
    this.start = vi.fn()
    this.stop = vi.fn()
    this.dispose = vi.fn()
  }),
}))

function makeCallbacks(): AnsiCallbacks {
  return {
    onRequestAnsiTab: vi.fn().mockResolvedValue({
      write: vi.fn(),
      container: { getBoundingClientRect: () => ({ width: 0, height: 0 }) },
      dispose: vi.fn(),
    } as unknown as AnsiTerminalHandle),
    onCloseAnsiTab: vi.fn(),
  }
}

describe('AnsiController input pass-through', () => {
  let controller: AnsiController

  beforeEach(() => {
    controller = new AnsiController(makeCallbacks())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('getKeysTyped returns empty array when no InputCapture attached', () => {
    expect(controller.getKeysTyped()).toEqual([])
  })

  it('modifier helpers return false when no InputCapture attached', () => {
    expect(controller.isShiftDown()).toBe(false)
    expect(controller.isCtrlDown()).toBe(false)
    expect(controller.isAltDown()).toBe(false)
    expect(controller.isMetaDown()).toBe(false)
  })

  it('getKeysTyped delegates to InputAPI', () => {
    const events: KeyTypedEvent[] = [
      { key: 'q', code: 'KeyQ', shift: false, ctrl: false, alt: false, meta: false },
      { key: 'S', code: 'KeyS', shift: true, ctrl: false, alt: false, meta: false },
    ]
    const spy = vi.spyOn(InputAPI.prototype, 'getKeysTyped').mockReturnValue(events)
    expect(controller.getKeysTyped()).toBe(events)
    expect(spy).toHaveBeenCalled()
  })

  it('isShiftDown delegates to InputAPI', () => {
    const spy = vi.spyOn(InputAPI.prototype, 'isShiftDown').mockReturnValue(true)
    expect(controller.isShiftDown()).toBe(true)
    expect(spy).toHaveBeenCalled()
  })

  it('isCtrlDown delegates to InputAPI', () => {
    const spy = vi.spyOn(InputAPI.prototype, 'isCtrlDown').mockReturnValue(true)
    expect(controller.isCtrlDown()).toBe(true)
    expect(spy).toHaveBeenCalled()
  })

  it('isAltDown delegates to InputAPI', () => {
    const spy = vi.spyOn(InputAPI.prototype, 'isAltDown').mockReturnValue(true)
    expect(controller.isAltDown()).toBe(true)
    expect(spy).toHaveBeenCalled()
  })

  it('isMetaDown delegates to InputAPI', () => {
    const spy = vi.spyOn(InputAPI.prototype, 'isMetaDown').mockReturnValue(true)
    expect(controller.isMetaDown()).toBe(true)
    expect(spy).toHaveBeenCalled()
  })
})
