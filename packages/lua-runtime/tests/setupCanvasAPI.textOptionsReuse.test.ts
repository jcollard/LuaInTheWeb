/**
 * Tests for text options object reuse to reduce GC pressure (Issue #606).
 *
 * These tests verify that __canvas_text and __canvas_strokeText correctly
 * handle text options without creating unnecessary temporary objects.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LuaFactory, LuaEngine } from 'wasmoon'
import { setupCanvasAPI } from '../src/setupCanvasAPI'
import type { CanvasController } from '../src/CanvasController'

describe('setupCanvasAPI - text options (Issue #606 GC optimization)', () => {
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
      addAssetPath: vi.fn(),
      loadImageAsset: vi.fn().mockReturnValue({ _type: 'image', _name: 'test', _file: 'test.png' }),
      loadFontAsset: vi.fn().mockReturnValue({ _type: 'font', _name: 'test', _file: 'test.ttf' }),
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
      setReloadCallback: vi.fn(),
    } as unknown as CanvasController
  }

  describe('__canvas_text options handling', () => {
    it('should pass undefined options when no optional parameters are provided', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.draw_text(10, 20, "Hello")
      `)

      expect(mockController.drawText).toHaveBeenCalledWith(10, 20, 'Hello', undefined)
    })

    it('should correctly populate options with only fontSize', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.draw_text(10, 20, "Hello", { font_size = 24 })
      `)

      expect(mockController.drawText).toHaveBeenCalledWith(
        10, 20, 'Hello',
        expect.objectContaining({
          fontSize: 24,
          fontFamily: undefined,
          maxWidth: undefined
        })
      )
    })

    it('should correctly populate options with only fontFamily', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.draw_text(10, 20, "Hello", { font_family = "Arial" })
      `)

      expect(mockController.drawText).toHaveBeenCalledWith(
        10, 20, 'Hello',
        expect.objectContaining({
          fontSize: undefined,
          fontFamily: 'Arial',
          maxWidth: undefined
        })
      )
    })

    it('should correctly populate options with only maxWidth', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.draw_text(10, 20, "Hello", { max_width = 200 })
      `)

      expect(mockController.drawText).toHaveBeenCalledWith(
        10, 20, 'Hello',
        expect.objectContaining({
          fontSize: undefined,
          fontFamily: undefined,
          maxWidth: 200
        })
      )
    })

    it('should correctly populate options with all parameters', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.draw_text(10, 20, "Hello", { font_size = 32, font_family = "Verdana", max_width = 150 })
      `)

      expect(mockController.drawText).toHaveBeenCalledWith(
        10, 20, 'Hello',
        expect.objectContaining({
          fontSize: 32,
          fontFamily: 'Verdana',
          maxWidth: 150
        })
      )
    })

    it('should handle multiple consecutive calls with different options', async () => {
      // Track options as they are passed (snapshot values)
      const capturedOptions: Array<{ fontSize?: number; fontFamily?: string; maxWidth?: number } | undefined> = []
      const mockController = createMockController()
      ;(mockController.drawText as ReturnType<typeof vi.fn>).mockImplementation(
        (_x: number, _y: number, _text: string, options?: { fontSize?: number; fontFamily?: string; maxWidth?: number }) => {
          // Capture a snapshot of the options at call time
          if (options) {
            capturedOptions.push({
              fontSize: options.fontSize,
              fontFamily: options.fontFamily,
              maxWidth: options.maxWidth
            })
          } else {
            capturedOptions.push(undefined)
          }
        }
      )
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.draw_text(0, 0, "First", { font_size = 12 })
        canvas.draw_text(0, 0, "Second", { font_family = "Arial" })
        canvas.draw_text(0, 0, "Third", { max_width = 100 })
        canvas.draw_text(0, 0, "Fourth")
      `)

      expect(capturedOptions).toHaveLength(4)

      // First call: fontSize only
      expect(capturedOptions[0]).toMatchObject({
        fontSize: 12,
        fontFamily: undefined,
        maxWidth: undefined
      })

      // Second call: fontFamily only
      expect(capturedOptions[1]).toMatchObject({
        fontSize: undefined,
        fontFamily: 'Arial',
        maxWidth: undefined
      })

      // Third call: maxWidth only
      expect(capturedOptions[2]).toMatchObject({
        fontSize: undefined,
        fontFamily: undefined,
        maxWidth: 100
      })

      // Fourth call: no options
      expect(capturedOptions[3]).toBeUndefined()
    })
  })

  describe('__canvas_strokeText options handling', () => {
    it('should pass undefined options when no optional parameters are provided', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.stroke_text(10, 20, "Hello")
      `)

      expect(mockController.strokeText).toHaveBeenCalledWith(10, 20, 'Hello', undefined)
    })

    it('should correctly populate options with only fontSize', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.stroke_text(10, 20, "Hello", { font_size = 24 })
      `)

      expect(mockController.strokeText).toHaveBeenCalledWith(
        10, 20, 'Hello',
        expect.objectContaining({
          fontSize: 24,
          fontFamily: undefined,
          maxWidth: undefined
        })
      )
    })

    it('should correctly populate options with only fontFamily', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.stroke_text(10, 20, "Hello", { font_family = "Arial" })
      `)

      expect(mockController.strokeText).toHaveBeenCalledWith(
        10, 20, 'Hello',
        expect.objectContaining({
          fontSize: undefined,
          fontFamily: 'Arial',
          maxWidth: undefined
        })
      )
    })

    it('should correctly populate options with only maxWidth', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.stroke_text(10, 20, "Hello", { max_width = 200 })
      `)

      expect(mockController.strokeText).toHaveBeenCalledWith(
        10, 20, 'Hello',
        expect.objectContaining({
          fontSize: undefined,
          fontFamily: undefined,
          maxWidth: 200
        })
      )
    })

    it('should correctly populate options with all parameters', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.stroke_text(10, 20, "Hello", { font_size = 32, font_family = "Verdana", max_width = 150 })
      `)

      expect(mockController.strokeText).toHaveBeenCalledWith(
        10, 20, 'Hello',
        expect.objectContaining({
          fontSize: 32,
          fontFamily: 'Verdana',
          maxWidth: 150
        })
      )
    })

    it('should handle multiple consecutive calls with different options', async () => {
      // Track options as they are passed (snapshot values)
      const capturedOptions: Array<{ fontSize?: number; fontFamily?: string; maxWidth?: number } | undefined> = []
      const mockController = createMockController()
      ;(mockController.strokeText as ReturnType<typeof vi.fn>).mockImplementation(
        (_x: number, _y: number, _text: string, options?: { fontSize?: number; fontFamily?: string; maxWidth?: number }) => {
          // Capture a snapshot of the options at call time
          if (options) {
            capturedOptions.push({
              fontSize: options.fontSize,
              fontFamily: options.fontFamily,
              maxWidth: options.maxWidth
            })
          } else {
            capturedOptions.push(undefined)
          }
        }
      )
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.stroke_text(0, 0, "First", { font_size = 12 })
        canvas.stroke_text(0, 0, "Second", { font_family = "Arial" })
        canvas.stroke_text(0, 0, "Third", { max_width = 100 })
        canvas.stroke_text(0, 0, "Fourth")
      `)

      expect(capturedOptions).toHaveLength(4)

      // First call: fontSize only
      expect(capturedOptions[0]).toMatchObject({
        fontSize: 12,
        fontFamily: undefined,
        maxWidth: undefined
      })

      // Second call: fontFamily only
      expect(capturedOptions[1]).toMatchObject({
        fontSize: undefined,
        fontFamily: 'Arial',
        maxWidth: undefined
      })

      // Third call: maxWidth only
      expect(capturedOptions[2]).toMatchObject({
        fontSize: undefined,
        fontFamily: undefined,
        maxWidth: 100
      })

      // Fourth call: no options
      expect(capturedOptions[3]).toBeUndefined()
    })
  })
})
