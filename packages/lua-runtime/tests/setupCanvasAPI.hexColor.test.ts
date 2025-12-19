/**
 * Tests for setupCanvasAPI - hex color support.
 * Verifies that canvas.set_color() supports hex color strings (#RGB, #RRGGBB, #RRGGBBAA).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LuaFactory, LuaEngine } from 'wasmoon'
import { setupCanvasAPI } from '../src/setupCanvasAPI'
import type { CanvasController } from '../src/CanvasController'

describe('setupCanvasAPI hex color support', () => {
  let engine: LuaEngine

  beforeEach(async () => {
    const factory = new LuaFactory()
    engine = await factory.createEngine()
  })

  afterEach(() => {
    engine.global.close()
  })

  // Create a mock controller that doesn't rely on canvas-runtime
  function createMockController(): CanvasController {
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
      isKeyDown: vi.fn().mockReturnValue(false),
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
      registerAsset: vi.fn(),
      getAssetManifest: vi.fn().mockReturnValue(new Map()),
      loadAssets: vi.fn().mockResolvedValue(undefined),
      drawImage: vi.fn(),
      getAssetWidth: vi.fn().mockReturnValue(64),
      getAssetHeight: vi.fn().mockReturnValue(64),
    } as unknown as CanvasController
  }

  describe('short hex format (#RGB)', () => {
    it('should parse #F00 to red with alpha 255', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.set_color('#F00')
      `)

      expect(mockController.setColor).toHaveBeenCalledWith(255, 0, 0, 255)
    })

    it('should parse #000 to black (boundary case)', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.set_color('#000')
      `)

      expect(mockController.setColor).toHaveBeenCalledWith(0, 0, 0, 255)
    })

    it('should parse #FFF to white (boundary case)', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.set_color('#FFF')
      `)

      expect(mockController.setColor).toHaveBeenCalledWith(255, 255, 255, 255)
    })

    it('should parse #A5F to mixed values with correct expansion', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.set_color('#A5F')
      `)

      // #A5F expands to #AA55FF = RGB(170, 85, 255)
      expect(mockController.setColor).toHaveBeenCalledWith(170, 85, 255, 255)
    })

    it('should be case insensitive (tonumber base 16)', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.set_color('#abc')
      `)

      // #abc expands to #AABBCC = RGB(170, 187, 204)
      expect(mockController.setColor).toHaveBeenCalledWith(170, 187, 204, 255)
    })
  })

  describe('full hex format (#RRGGBB)', () => {
    it('should parse #1A2B3C to correct RGB values', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.set_color('#1A2B3C')
      `)

      // #1A2B3C = RGB(26, 43, 60)
      expect(mockController.setColor).toHaveBeenCalledWith(26, 43, 60, 255)
    })
  })

  describe('full hex with alpha format (#RRGGBBAA)', () => {
    it('should parse #FF000080 to semi-transparent red', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.set_color('#FF000080')
      `)

      // #FF000080 = RGBA(255, 0, 0, 128)
      expect(mockController.setColor).toHaveBeenCalledWith(255, 0, 0, 128)
    })

    it('should parse #00000000 to fully transparent (boundary case)', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.set_color('#00000000')
      `)

      expect(mockController.setColor).toHaveBeenCalledWith(0, 0, 0, 0)
    })

    it('should parse #FFFFFFFF to fully opaque white (boundary case)', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.set_color('#FFFFFFFF')
      `)

      expect(mockController.setColor).toHaveBeenCalledWith(255, 255, 255, 255)
    })
  })

  describe('backward compatibility', () => {
    it('should still accept RGBA numbers without alpha', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.set_color(255, 128, 64)
      `)

      expect(mockController.setColor).toHaveBeenCalledWith(255, 128, 64, undefined)
    })

    it('should still accept RGBA numbers with alpha', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.set_color(255, 128, 64, 200)
      `)

      expect(mockController.setColor).toHaveBeenCalledWith(255, 128, 64, 200)
    })
  })

  describe('error handling', () => {
    it('should throw error for invalid hex length with helpful message', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await expect(
        engine.doString(`
          local canvas = require('canvas')
          canvas.set_color('#AB')
        `)
      ).rejects.toThrow('Expected #RGB, #RRGGBB, or #RRGGBBAA')
    })

    it('should throw error for in-between invalid length (5 chars)', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await expect(
        engine.doString(`
          local canvas = require('canvas')
          canvas.set_color('#ABCDE')
        `)
      ).rejects.toThrow('Invalid hex color format')
    })

    it('should throw error for non-hex characters', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await expect(
        engine.doString(`
          local canvas = require('canvas')
          canvas.set_color('#GGG')
        `)
      ).rejects.toThrow('Invalid hex color')
    })
  })
})
