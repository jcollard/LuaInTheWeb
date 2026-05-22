/**
 * Tests for the typed-character and modifier-state bridge functions
 * registered by setupAnsiAPI: __ansi_getKeysTyped, __ansi_isShiftDown,
 * __ansi_isCtrlDown, __ansi_isAltDown, __ansi_isMetaDown.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LuaFactory, LuaEngine } from 'wasmoon'
import { setupAnsiAPI } from '../src/setupAnsiAPI'
import type { AnsiController } from '../src/AnsiController'
import type { KeyTypedEvent } from '@lua-learning/canvas-runtime'

function createMockController(): AnsiController {
  return {
    isActive: vi.fn().mockReturnValue(false),
    getKeysTyped: vi.fn().mockReturnValue([] as KeyTypedEvent[]),
    isShiftDown: vi.fn().mockReturnValue(false),
    isCtrlDown: vi.fn().mockReturnValue(false),
    isAltDown: vi.fn().mockReturnValue(false),
    isMetaDown: vi.fn().mockReturnValue(false),
  } as unknown as AnsiController
}

describe('setupAnsiAPI typed-input bridge', () => {
  let engine: LuaEngine
  let controller: AnsiController

  beforeEach(async () => {
    const factory = new LuaFactory()
    engine = await factory.createEngine()
    controller = createMockController()
    setupAnsiAPI(engine, () => controller, { fileReader: vi.fn(), cwd: '/' })
  })

  afterEach(() => {
    engine.global.close()
  })

  describe('__ansi_getKeysTyped', () => {
    it('returns empty array when controller has no events', async () => {
      const result = await engine.doString('return #__ansi_getKeysTyped()')
      expect(result).toBe(0)
    })

    it('delegates to controller.getKeysTyped()', async () => {
      const events: KeyTypedEvent[] = [
        { key: 'a', code: 'KeyA', shift: false, ctrl: false, alt: false, meta: false },
        { key: '!', code: 'Digit1', shift: true, ctrl: false, alt: false, meta: false },
      ]
      vi.mocked(controller.getKeysTyped).mockReturnValue(events)
      const length = await engine.doString('return #__ansi_getKeysTyped()')
      expect(length).toBe(2)
      expect(controller.getKeysTyped).toHaveBeenCalled()
    })

    it('exposes event fields (key, code, modifiers) to Lua', async () => {
      vi.mocked(controller.getKeysTyped).mockReturnValue([
        { key: '!', code: 'Digit1', shift: true, ctrl: false, alt: false, meta: false },
      ])
      const result = await engine.doString(`
        local ev = __ansi_getKeysTyped()[1]
        return { key = ev.key, code = ev.code, shift = ev.shift, ctrl = ev.ctrl, alt = ev.alt, meta = ev.meta }
      `) as Record<string, unknown>
      expect(result).toEqual({ key: '!', code: 'Digit1', shift: true, ctrl: false, alt: false, meta: false })
    })

    it('returns empty array when controller is null', async () => {
      // Replace the controller getter to return null
      const factory = new LuaFactory()
      const isolatedEngine = await factory.createEngine()
      setupAnsiAPI(isolatedEngine, () => null, {
        readFile: vi.fn(),
        resolveScreenPath: vi.fn(),
      })
      const length = await isolatedEngine.doString('return #__ansi_getKeysTyped()')
      expect(length).toBe(0)
      isolatedEngine.global.close()
    })
  })

  describe('modifier-state bridges', () => {
    it('__ansi_isShiftDown delegates to controller', async () => {
      vi.mocked(controller.isShiftDown).mockReturnValue(true)
      const result = await engine.doString('return __ansi_isShiftDown()')
      expect(result).toBe(true)
      expect(controller.isShiftDown).toHaveBeenCalled()
    })

    it('__ansi_isCtrlDown delegates to controller', async () => {
      vi.mocked(controller.isCtrlDown).mockReturnValue(true)
      expect(await engine.doString('return __ansi_isCtrlDown()')).toBe(true)
    })

    it('__ansi_isAltDown delegates to controller', async () => {
      vi.mocked(controller.isAltDown).mockReturnValue(true)
      expect(await engine.doString('return __ansi_isAltDown()')).toBe(true)
    })

    it('__ansi_isMetaDown delegates to controller', async () => {
      vi.mocked(controller.isMetaDown).mockReturnValue(true)
      expect(await engine.doString('return __ansi_isMetaDown()')).toBe(true)
    })

    it('modifier bridges return false when controller is null', async () => {
      const factory = new LuaFactory()
      const isolatedEngine = await factory.createEngine()
      setupAnsiAPI(isolatedEngine, () => null, {
        readFile: vi.fn(),
        resolveScreenPath: vi.fn(),
      })
      expect(await isolatedEngine.doString('return __ansi_isShiftDown()')).toBe(false)
      expect(await isolatedEngine.doString('return __ansi_isCtrlDown()')).toBe(false)
      expect(await isolatedEngine.doString('return __ansi_isAltDown()')).toBe(false)
      expect(await isolatedEngine.doString('return __ansi_isMetaDown()')).toBe(false)
      isolatedEngine.global.close()
    })
  })
})
