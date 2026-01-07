/**
 * Tests for canvas API Lua bindings - Path API functionality.
 * Tests path drawing bindings (begin_path, close_path, move_to, line_to, fill, stroke).
 * Core binding tests are in setupCanvasAPI.test.ts
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LuaFactory, type LuaEngine } from 'wasmoon'
import { setupCanvasAPI } from '../src/setupCanvasAPI'
import type { CanvasController } from '../src/CanvasController'

describe('setupCanvasAPI Path API', () => {
  let engine: LuaEngine

  beforeEach(async () => {
    const factory = new LuaFactory()
    engine = await factory.createEngine()
  })

  afterEach(() => {
    engine.global.close()
  })

  function createMockController() {
    return {
      start: vi.fn(() => Promise.resolve()),
      stop: vi.fn(),
      isActive: vi.fn(() => false),
      setOnDrawCallback: vi.fn(),
      setSize: vi.fn(),
      getWidth: vi.fn(() => 800),
      getHeight: vi.fn(() => 600),
      clear: vi.fn(),
      setColor: vi.fn(),
      setLineWidth: vi.fn(),
      rect: vi.fn(),
      fillRect: vi.fn(),
      circle: vi.fn(),
      fillCircle: vi.fn(),
      line: vi.fn(),
      text: vi.fn(),
      registerImageAsset: vi.fn(),
      registerFontAsset: vi.fn(),
      getAssetWidth: vi.fn(),
      getAssetHeight: vi.fn(),
      drawImage: vi.fn(),
      getDelta: vi.fn(() => 0.016),
      getTime: vi.fn(() => 1.5),
      isKeyDown: vi.fn(() => false),
      isKeyPressed: vi.fn(() => false),
      getKeysDown: vi.fn(() => []),
      getKeysPressed: vi.fn(() => []),
      getMouseX: vi.fn(() => 0),
      getMouseY: vi.fn(() => 0),
      isMouseButtonDown: vi.fn(() => false),
      isMouseButtonPressed: vi.fn(() => false),
      getInputState: vi.fn(() => ({
        keysDown: [],
        keysPressed: [],
        mouseX: 0,
        mouseY: 0,
        mouseButtonsDown: [],
        mouseButtonsPressed: [],
      })),
      setFontSize: vi.fn(),
      setFontFamily: vi.fn(),
      getTextWidth: vi.fn(() => 100),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      transform: vi.fn(),
      setTransform: vi.fn(),
      resetTransform: vi.fn(),
      // Path API methods
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      arcTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      bezierCurveTo: vi.fn(),
      setReloadCallback: vi.fn(),
    } as unknown as CanvasController
  }

  describe('path function exposure', () => {
    it('should expose all path functions via require', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      const result = await engine.doString(`
        local canvas = require('canvas')
        local functions = {
          'begin_path', 'close_path',
          'move_to', 'line_to',
          'fill', 'stroke'
        }
        for _, name in ipairs(functions) do
          if type(canvas[name]) ~= 'function' then
            error('Missing function: ' .. name)
          end
        end
        return true
      `)
      expect(result).toBe(true)
    })
  })

  describe('beginPath', () => {
    it('should call beginPath on controller', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.begin_path()
      `)

      expect(mockController.beginPath).toHaveBeenCalled()
    })
  })

  describe('closePath', () => {
    it('should call closePath on controller', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.close_path()
      `)

      expect(mockController.closePath).toHaveBeenCalled()
    })
  })

  describe('moveTo', () => {
    it('should call moveTo on controller with correct coordinates', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.move_to(100, 150)
      `)

      expect(mockController.moveTo).toHaveBeenCalledWith(100, 150)
    })
  })

  describe('lineTo', () => {
    it('should call lineTo on controller with correct coordinates', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.line_to(200, 250)
      `)

      expect(mockController.lineTo).toHaveBeenCalledWith(200, 250)
    })
  })

  describe('fill', () => {
    it('should call fill on controller', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.fill()
      `)

      expect(mockController.fill).toHaveBeenCalled()
    })
  })

  describe('stroke', () => {
    it('should call stroke on controller', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.stroke()
      `)

      expect(mockController.stroke).toHaveBeenCalled()
    })
  })

  describe('quadratic_curve_to', () => {
    it('should call quadraticCurveTo on controller with correct parameters', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.quadratic_curve_to(100, 50, 200, 100)
      `)

      expect(mockController.quadraticCurveTo).toHaveBeenCalledWith(100, 50, 200, 100)
    })

    it('should handle zero coordinates', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.quadratic_curve_to(0, 0, 0, 0)
      `)

      expect(mockController.quadraticCurveTo).toHaveBeenCalledWith(0, 0, 0, 0)
    })

    it('should handle negative coordinates', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.quadratic_curve_to(-50, -100, -150, -200)
      `)

      expect(mockController.quadraticCurveTo).toHaveBeenCalledWith(-50, -100, -150, -200)
    })
  })

  describe('bezier_curve_to', () => {
    it('should call bezierCurveTo on controller with correct parameters', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.bezier_curve_to(100, 50, 200, 150, 300, 100)
      `)

      expect(mockController.bezierCurveTo).toHaveBeenCalledWith(100, 50, 200, 150, 300, 100)
    })

    it('should handle zero coordinates', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.bezier_curve_to(0, 0, 0, 0, 0, 0)
      `)

      expect(mockController.bezierCurveTo).toHaveBeenCalledWith(0, 0, 0, 0, 0, 0)
    })

    it('should handle negative coordinates', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.bezier_curve_to(-50, -100, -150, -200, -250, -300)
      `)

      expect(mockController.bezierCurveTo).toHaveBeenCalledWith(-50, -100, -150, -200, -250, -300)
    })
  })

  describe('path workflow', () => {
    it('should support complete triangle path workflow', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.begin_path()
        canvas.move_to(100, 100)
        canvas.line_to(150, 50)
        canvas.line_to(200, 100)
        canvas.close_path()
        canvas.fill()
      `)

      expect(mockController.beginPath).toHaveBeenCalled()
      expect(mockController.moveTo).toHaveBeenCalledWith(100, 100)
      expect(mockController.lineTo).toHaveBeenCalledWith(150, 50)
      expect(mockController.lineTo).toHaveBeenCalledWith(200, 100)
      expect(mockController.closePath).toHaveBeenCalled()
      expect(mockController.fill).toHaveBeenCalled()
    })

    it('should support both fill and stroke on same path', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.begin_path()
        canvas.move_to(50, 50)
        canvas.line_to(100, 50)
        canvas.line_to(75, 100)
        canvas.close_path()
        canvas.set_color(255, 0, 0)
        canvas.fill()
        canvas.set_color(0, 0, 0)
        canvas.stroke()
      `)

      expect(mockController.fill).toHaveBeenCalled()
      expect(mockController.stroke).toHaveBeenCalled()
    })
  })
})
