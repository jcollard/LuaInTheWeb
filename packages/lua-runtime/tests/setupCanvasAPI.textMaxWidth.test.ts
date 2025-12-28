/**
 * Tests for draw_text with maxWidth option.
 * Tests the canvas text width constraint feature.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LuaFactory, LuaEngine } from 'wasmoon'
import { setupCanvasAPI } from '../src/setupCanvasAPI'
import type { CanvasController } from '../src/CanvasController'

describe('setupCanvasAPI - draw_text maxWidth', () => {
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
      setFilter: vi.fn(),
    } as unknown as CanvasController
  }

  describe('draw_text with max_width option', () => {
    it('should call drawText with maxWidth when max_width option is provided', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.draw_text(10, 50, "Long text here", { max_width = 100 })
      `)

      expect(mockController.drawText).toHaveBeenCalledWith(
        10, 50, "Long text here",
        expect.objectContaining({ maxWidth: 100 })
      )
    })

    it('should call drawText without maxWidth when option is not provided', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.draw_text(10, 50, "Normal text")
      `)

      expect(mockController.drawText).toHaveBeenCalledWith(
        10, 50, "Normal text",
        undefined
      )
    })

    it('should call drawText with both font_size and max_width', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.draw_text(10, 50, "Styled text", { font_size = 20, max_width = 150 })
      `)

      expect(mockController.drawText).toHaveBeenCalledWith(
        10, 50, "Styled text",
        expect.objectContaining({ fontSize: 20, maxWidth: 150 })
      )
    })

    it('should call drawText with font_family and max_width', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.draw_text(10, 50, "Custom font", { font_family = "Arial", max_width = 200 })
      `)

      expect(mockController.drawText).toHaveBeenCalledWith(
        10, 50, "Custom font",
        expect.objectContaining({ fontFamily: "Arial", maxWidth: 200 })
      )
    })

    it('should handle maxWidth of 0', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.draw_text(10, 50, "Zero width", { max_width = 0 })
      `)

      expect(mockController.drawText).toHaveBeenCalledWith(
        10, 50, "Zero width",
        expect.objectContaining({ maxWidth: 0 })
      )
    })
  })
})
