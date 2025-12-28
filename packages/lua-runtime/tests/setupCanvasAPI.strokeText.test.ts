/**
 * Tests for canvas.stroke_text() Lua API.
 * Tests text outline rendering with optional font and maxWidth options.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LuaFactory, LuaEngine } from 'wasmoon'
import { setupCanvasAPI } from '../src/setupCanvasAPI'
import type { CanvasController } from '../src/CanvasController'

describe('setupCanvasAPI - stroke_text', () => {
  let engine: LuaEngine

  beforeEach(async () => {
    const factory = new LuaFactory()
    engine = await factory.createEngine()
  })

  afterEach(() => {
    engine.global.close()
  })

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
      strokeText: vi.fn(),
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
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      transform: vi.fn(),
      setTransform: vi.fn(),
      resetTransform: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      setTextAlign: vi.fn(),
      setTextBaseline: vi.fn(),
      setDirection: vi.fn(),
    } as unknown as CanvasController
  }

  describe('stroke_text function', () => {
    it('should expose stroke_text function via require', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      const result = await engine.doString(`
        local canvas = require('canvas')
        return type(canvas.stroke_text)
      `)
      expect(result).toBe('function')
    })

    it('should call strokeText with x, y, and text', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.stroke_text(100, 50, "Hello World")
      `)

      expect(mockController.strokeText).toHaveBeenCalledWith(
        100, 50, 'Hello World',
        expect.objectContaining({})
      )
    })

    it('should call strokeText with font_size option', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.stroke_text(10, 20, "Sized", { font_size = 24 })
      `)

      expect(mockController.strokeText).toHaveBeenCalledWith(
        10, 20, 'Sized',
        expect.objectContaining({ fontSize: 24 })
      )
    })

    it('should call strokeText with font_family option', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.stroke_text(0, 0, "Custom Font", { font_family = "Arial" })
      `)

      expect(mockController.strokeText).toHaveBeenCalledWith(
        0, 0, 'Custom Font',
        expect.objectContaining({ fontFamily: 'Arial' })
      )
    })

    it('should call strokeText with max_width option', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.stroke_text(50, 50, "Constrained", { max_width = 200 })
      `)

      expect(mockController.strokeText).toHaveBeenCalledWith(
        50, 50, 'Constrained',
        expect.objectContaining({ maxWidth: 200 })
      )
    })

    it('should call strokeText with all options combined', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.stroke_text(100, 100, "Full Options", {
          font_size = 32,
          font_family = "Verdana",
          max_width = 150
        })
      `)

      expect(mockController.strokeText).toHaveBeenCalledWith(
        100, 100, 'Full Options',
        expect.objectContaining({
          fontSize: 32,
          fontFamily: 'Verdana',
          maxWidth: 150
        })
      )
    })

    it('should not call strokeText when controller is null', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => null)

      // Should not throw when controller is null
      await engine.doString(`
        local canvas = require('canvas')
        canvas.stroke_text(0, 0, "No controller")
      `)

      expect(mockController.strokeText).not.toHaveBeenCalled()
    })
  })
})
