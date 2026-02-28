/**
 * Tests for digit key normalization in canvasLuaCode input.
 * Verifies that pressing "1", "2", etc. produces "Digit1", "Digit2", etc.
 * in the Lua runtime, matching the behavior of ansiLuaCode/input.ts.
 *
 * Issue #659: Add digit key normalization tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LuaFactory, LuaEngine } from 'wasmoon'
import { setupCanvasAPI } from '../src/setupCanvasAPI'
import type { CanvasController } from '../src/CanvasController'

describe('canvasLuaCode input digit normalization', () => {
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
  } = {}): CanvasController {
    return {
      isActive: vi.fn().mockReturnValue(false),
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
      setOnDrawCallback: vi.fn(),
      clear: vi.fn(),
      setColor: vi.fn(),
      setLineWidth: vi.fn(),
      setSize: vi.fn(),
      drawRect: vi.fn(),
      fillRect: vi.fn(),
      drawCircle: vi.fn(),
      fillCircle: vi.fn(),
      drawLine: vi.fn(),
      drawText: vi.fn(),
      getDelta: vi.fn().mockReturnValue(0.016),
      getTime: vi.fn().mockReturnValue(1.0),
      getWidth: vi.fn().mockReturnValue(800),
      getHeight: vi.fn().mockReturnValue(600),
      isKeyDown: options.isKeyDown
        ? vi.fn().mockImplementation(options.isKeyDown)
        : vi.fn().mockReturnValue(false),
      isKeyPressed: vi.fn().mockReturnValue(false),
      getKeysDown: vi.fn().mockReturnValue([]),
      getKeysPressed: vi.fn().mockReturnValue([]),
      getMouseX: vi.fn().mockReturnValue(0),
      getMouseY: vi.fn().mockReturnValue(0),
      isMouseButtonDown: vi.fn().mockReturnValue(false),
      isMouseButtonPressed: vi.fn().mockReturnValue(false),
      getInputState: vi.fn().mockReturnValue({
        keysDown: [],
        keysPressed: [],
        mouseX: 0,
        mouseY: 0,
        mouseButtonsDown: [],
        mouseButtonsPressed: [],
      }),
      addAssetPath: vi.fn(),
      loadImageAsset: vi.fn(),
      loadFontAsset: vi.fn(),
      getAssetManifest: vi.fn().mockReturnValue(new Map()),
      loadAssets: vi.fn().mockResolvedValue(undefined),
      drawImage: vi.fn(),
      getAssetWidth: vi.fn().mockReturnValue(64),
      getAssetHeight: vi.fn().mockReturnValue(64),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      transform: vi.fn(),
      setTransform: vi.fn(),
      resetTransform: vi.fn(),
      setReloadCallback: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
    } as unknown as CanvasController
  }

  describe('digit keys normalize to Digit codes', () => {
    it('should normalize "1" to "Digit1" in is_key_down', async () => {
      const mockController = createMockController({
        isKeyDown: (key: string) => key === 'Digit1',
      })
      setupCanvasAPI(engine, () => mockController)

      const result = await engine.doString(`
        local canvas = require('canvas')
        return canvas.is_key_down("1")
      `)
      expect(result).toBe(true)
    })

    it('should normalize "0" to "Digit0" in is_key_down', async () => {
      const mockController = createMockController({
        isKeyDown: (key: string) => key === 'Digit0',
      })
      setupCanvasAPI(engine, () => mockController)

      const result = await engine.doString(`
        local canvas = require('canvas')
        return canvas.is_key_down("0")
      `)
      expect(result).toBe(true)
    })

    it('should normalize "9" to "Digit9" in is_key_down', async () => {
      const mockController = createMockController({
        isKeyDown: (key: string) => key === 'Digit9',
      })
      setupCanvasAPI(engine, () => mockController)

      const result = await engine.doString(`
        local canvas = require('canvas')
        return canvas.is_key_down("9")
      `)
      expect(result).toBe(true)
    })

    it('should not normalize non-digit single characters', async () => {
      // "a" should normalize to "KeyA", not remain as "a"
      const mockController = createMockController({
        isKeyDown: (key: string) => key === 'KeyA',
      })
      setupCanvasAPI(engine, () => mockController)

      const result = await engine.doString(`
        local canvas = require('canvas')
        return canvas.is_key_down("a")
      `)
      expect(result).toBe(true)
    })

    it('should pass through already-normalized "Digit1" unchanged', async () => {
      const mockController = createMockController({
        isKeyDown: (key: string) => key === 'Digit1',
      })
      setupCanvasAPI(engine, () => mockController)

      const result = await engine.doString(`
        local canvas = require('canvas')
        return canvas.is_key_down("Digit1")
      `)
      expect(result).toBe(true)
    })
  })
})
