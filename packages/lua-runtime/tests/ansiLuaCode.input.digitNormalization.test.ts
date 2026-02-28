/**
 * Tests for digit key normalization in ansiLuaCode input.
 * Verifies that pressing "1", "2", etc. produces "Digit1", "Digit2", etc.
 * in the Lua runtime.
 *
 * Issue #659: Add digit key normalization tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LuaFactory, LuaEngine } from 'wasmoon'
import { setupAnsiAPI } from '../src/setupAnsiAPI'
import type { AnsiController } from '../src/AnsiController'

describe('ansiLuaCode input digit normalization', () => {
  let engine: LuaEngine

  beforeEach(async () => {
    const factory = new LuaFactory()
    engine = await factory.createEngine()
  })

  afterEach(() => {
    engine.global.close()
  })

  function createMockController(options: {
    isKeyDown?: (key: string) => boolean
  } = {}): AnsiController {
    return {
      isActive: vi.fn().mockReturnValue(true),
      start: vi.fn().mockReturnValue(undefined),
      stop: vi.fn(),
      setDrawCallback: vi.fn(),
      clear: vi.fn(),
      setColor: vi.fn(),
      setChar: vi.fn(),
      setString: vi.fn(),
      fillRect: vi.fn(),
      drawRect: vi.fn(),
      getWidth: vi.fn().mockReturnValue(80),
      getHeight: vi.fn().mockReturnValue(24),
      getDelta: vi.fn().mockReturnValue(0.016),
      getTime: vi.fn().mockReturnValue(1.0),
      isKeyDown: options.isKeyDown
        ? vi.fn().mockImplementation(options.isKeyDown)
        : vi.fn().mockReturnValue(false),
      isKeyPressed: vi.fn().mockReturnValue(false),
      getKeysDown: vi.fn().mockReturnValue([]),
      getKeysPressed: vi.fn().mockReturnValue([]),
      isMouseDown: vi.fn().mockReturnValue(false),
      isMousePressed: vi.fn().mockReturnValue(false),
      getMouseCol: vi.fn().mockReturnValue(0),
      getMouseRow: vi.fn().mockReturnValue(0),
      isMouseTopHalf: vi.fn().mockReturnValue(false),
      getMouseX: vi.fn().mockReturnValue(0),
      getMouseY: vi.fn().mockReturnValue(0),
      setReloadCallback: vi.fn(),
      getScreen: vi.fn().mockReturnValue(null),
      loadScreen: vi.fn(),
    } as unknown as AnsiController
  }

  describe('digit keys normalize to Digit codes', () => {
    it('should normalize "1" to "Digit1" in is_key_down', async () => {
      const mockController = createMockController({
        isKeyDown: (key: string) => key === 'Digit1',
      })
      setupAnsiAPI(engine, () => mockController)

      const result = await engine.doString(`
        local ansi = require('ansi')
        return ansi.is_key_down("1")
      `)
      expect(result).toBe(true)
    })

    it('should normalize "0" to "Digit0" in is_key_down', async () => {
      const mockController = createMockController({
        isKeyDown: (key: string) => key === 'Digit0',
      })
      setupAnsiAPI(engine, () => mockController)

      const result = await engine.doString(`
        local ansi = require('ansi')
        return ansi.is_key_down("0")
      `)
      expect(result).toBe(true)
    })

    it('should normalize "9" to "Digit9" in is_key_down', async () => {
      const mockController = createMockController({
        isKeyDown: (key: string) => key === 'Digit9',
      })
      setupAnsiAPI(engine, () => mockController)

      const result = await engine.doString(`
        local ansi = require('ansi')
        return ansi.is_key_down("9")
      `)
      expect(result).toBe(true)
    })

    it('should not normalize non-digit single characters', async () => {
      // "a" should normalize to "KeyA", not remain as "a"
      const mockController = createMockController({
        isKeyDown: (key: string) => key === 'KeyA',
      })
      setupAnsiAPI(engine, () => mockController)

      const result = await engine.doString(`
        local ansi = require('ansi')
        return ansi.is_key_down("a")
      `)
      expect(result).toBe(true)
    })

    it('should pass through already-normalized "Digit1" unchanged', async () => {
      const mockController = createMockController({
        isKeyDown: (key: string) => key === 'Digit1',
      })
      setupAnsiAPI(engine, () => mockController)

      const result = await engine.doString(`
        local ansi = require('ansi')
        return ansi.is_key_down("Digit1")
      `)
      expect(result).toBe(true)
    })
  })
})
