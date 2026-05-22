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

  // These tests go through the full Lua wrapper — `local ansi = require('ansi'); ansi.get_keys_typed()`
  // — which is the exact path user code (and the typed_input_demo.lua example) take.
  describe('ansi.get_keys_typed (Lua wrapper)', () => {
    it('returns events with all fields readable from Lua via ipairs', async () => {
      vi.mocked(controller.getKeysTyped).mockReturnValue([
        { key: 'a', code: 'KeyA', shift: false, ctrl: false, alt: false, meta: false },
        { key: '!', code: 'Digit1', shift: true, ctrl: false, alt: false, meta: false },
      ])
      const result = await engine.doString(`
        local ansi = require('ansi')
        local events = ansi.get_keys_typed()
        local out = {}
        for i, ev in ipairs(events) do
          out[i] = { key = ev.key, code = ev.code, shift = ev.shift, ctrl = ev.ctrl, alt = ev.alt, meta = ev.meta }
        end
        return out
      `) as unknown[]
      expect(result).toEqual([
        { key: 'a', code: 'KeyA', shift: false, ctrl: false, alt: false, meta: false },
        { key: '!', code: 'Digit1', shift: true, ctrl: false, alt: false, meta: false },
      ])
    })

    it('appends letter keys to a buffer (text-input pattern from the demo)', async () => {
      vi.mocked(controller.getKeysTyped).mockReturnValue([
        { key: 'h', code: 'KeyH', shift: false, ctrl: false, alt: false, meta: false },
        { key: 'i', code: 'KeyI', shift: false, ctrl: false, alt: false, meta: false },
      ])
      const result = await engine.doString(`
        local ansi = require('ansi')
        local buffer = ""
        for _, ev in ipairs(ansi.get_keys_typed()) do
          if #ev.key == 1 and not ev.ctrl and not ev.meta then
            buffer = buffer .. ev.key
          end
        end
        return buffer
      `)
      expect(result).toBe('hi')
    })

    it('appends shifted symbols (Shift+1 = "!") to a buffer', async () => {
      vi.mocked(controller.getKeysTyped).mockReturnValue([
        { key: '!', code: 'Digit1', shift: true, ctrl: false, alt: false, meta: false },
        { key: '?', code: 'Slash', shift: true, ctrl: false, alt: false, meta: false },
      ])
      const result = await engine.doString(`
        local ansi = require('ansi')
        local buffer = ""
        for _, ev in ipairs(ansi.get_keys_typed()) do
          if #ev.key == 1 and not ev.ctrl and not ev.meta then
            buffer = buffer .. ev.key
          end
        end
        return buffer
      `)
      expect(result).toBe('!?')
    })

    // This is the bug the user reported: between frames, the underlying JS
    // array is mutated in place (cleared by update(), then refilled with new
    // events). The Lua wrapper must surface the new events, not stale data.
    it('reflects new events on subsequent calls when the JS array is mutated in place', async () => {
      // Simulate the controller backing the array with a stable reference and
      // mutating it across frames (this is what InputCapture does in practice).
      const sharedArray: KeyTypedEvent[] = []
      vi.mocked(controller.getKeysTyped).mockImplementation(() => sharedArray)

      // Frame 1: user types "a"
      sharedArray.push({ key: 'a', code: 'KeyA', shift: false, ctrl: false, alt: false, meta: false })
      const frame1 = await engine.doString(`
        local ansi = require('ansi')
        local buf = ""
        for _, ev in ipairs(ansi.get_keys_typed()) do
          if #ev.key == 1 then buf = buf .. ev.key end
        end
        return buf
      `)
      expect(frame1).toBe('a')

      // End of frame: update() clears the array (same reference, length 0).
      sharedArray.length = 0
      // Frame 2: user types "b" and "c"
      sharedArray.push({ key: 'b', code: 'KeyB', shift: false, ctrl: false, alt: false, meta: false })
      sharedArray.push({ key: 'c', code: 'KeyC', shift: false, ctrl: false, alt: false, meta: false })

      const frame2 = await engine.doString(`
        local ansi = require('ansi')
        local buf = ""
        for _, ev in ipairs(ansi.get_keys_typed()) do
          if #ev.key == 1 then buf = buf .. ev.key end
        end
        return buf
      `)
      expect(frame2).toBe('bc')
    })

    it('returns an empty result when the JS array is empty (no events this frame)', async () => {
      const sharedArray: KeyTypedEvent[] = []
      vi.mocked(controller.getKeysTyped).mockImplementation(() => sharedArray)

      // Frame 1: one event
      sharedArray.push({ key: 'a', code: 'KeyA', shift: false, ctrl: false, alt: false, meta: false })
      await engine.doString(`local ansi = require('ansi'); return ansi.get_keys_typed()`)

      // Frame 2: no events (array cleared, nothing pushed)
      sharedArray.length = 0
      const count = await engine.doString(`local ansi = require('ansi'); return #ansi.get_keys_typed()`)
      expect(count).toBe(0)
    })
  })
})
