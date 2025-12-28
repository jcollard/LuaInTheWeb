/**
 * Tests for canvas API Lua bindings - Path2D functionality.
 * Tests Path2D creation, building methods, rendering, and hit testing.
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LuaFactory, type LuaEngine } from 'wasmoon'
import { setupCanvasAPI } from '../src/setupCanvasAPI'
import type { CanvasController } from '../src/CanvasController'

describe('setupCanvasAPI Path2D API', () => {
  let engine: LuaEngine

  beforeEach(async () => {
    const factory = new LuaFactory()
    engine = await factory.createEngine()
  })

  afterEach(() => {
    engine.global.close()
  })

  function createMockController() {
    let nextPathId = 1
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
      rectPath: vi.fn(),
      // Path2D methods
      createPath: vi.fn(() => ({ id: nextPathId++ })),
      clonePath: vi.fn(() => ({ id: nextPathId++ })),
      disposePath: vi.fn(),
      pathMoveTo: vi.fn(),
      pathLineTo: vi.fn(),
      pathClosePath: vi.fn(),
      pathRect: vi.fn(),
      pathRoundRect: vi.fn(),
      pathArc: vi.fn(),
      pathArcTo: vi.fn(),
      pathEllipse: vi.fn(),
      pathQuadraticCurveTo: vi.fn(),
      pathBezierCurveTo: vi.fn(),
      pathAddPath: vi.fn(),
      fillPath: vi.fn(),
      strokePath: vi.fn(),
      clipPath: vi.fn(),
      isPointInStoredPath: vi.fn(() => true),
      isPointInStoredStroke: vi.fn(() => false),
    } as unknown as CanvasController
  }

  describe('Path2D creation', () => {
    it('should create an empty path', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      const result = await engine.doString(`
        local canvas = require('canvas')
        local path = canvas.create_path()
        return path ~= nil
      `)
      expect(result).toBe(true)
      expect(mockController.createPath).toHaveBeenCalledWith(undefined)
    })

    it('should create a path from SVG path string', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        local path = canvas.create_path("M10 10 L50 50 Z")
      `)
      expect(mockController.createPath).toHaveBeenCalledWith('M10 10 L50 50 Z')
    })

    it('should clone a path from another Path2D', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        local original = canvas.create_path()
        local cloned = canvas.create_path(original)
      `)
      expect(mockController.createPath).toHaveBeenCalledWith(undefined)
      expect(mockController.clonePath).toHaveBeenCalledWith(1)
    })

    it('should dispose a path', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        local path = canvas.create_path()
        path:dispose()
      `)
      expect(mockController.disposePath).toHaveBeenCalledWith(1)
    })
  })

  describe('Path2D building methods', () => {
    it('should call move_to on path', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        local path = canvas.create_path()
        path:move_to(100, 150)
      `)
      expect(mockController.pathMoveTo).toHaveBeenCalledWith(1, 100, 150)
    })

    it('should call line_to on path', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        local path = canvas.create_path()
        path:line_to(200, 250)
      `)
      expect(mockController.pathLineTo).toHaveBeenCalledWith(1, 200, 250)
    })

    it('should call close_path on path', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        local path = canvas.create_path()
        path:close_path()
      `)
      expect(mockController.pathClosePath).toHaveBeenCalledWith(1)
    })

    it('should call rect on path', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        local path = canvas.create_path()
        path:rect(10, 20, 100, 50)
      `)
      expect(mockController.pathRect).toHaveBeenCalledWith(1, 10, 20, 100, 50)
    })

    it('should call round_rect on path', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        local path = canvas.create_path()
        path:round_rect(10, 20, 100, 50, 10)
      `)
      expect(mockController.pathRoundRect).toHaveBeenCalledWith(1, 10, 20, 100, 50, 10)
    })

    it('should call arc on path', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        local path = canvas.create_path()
        path:arc(100, 100, 50, 0, math.pi * 2)
      `)
      expect(mockController.pathArc).toHaveBeenCalledWith(
        1, 100, 100, 50, 0, Math.PI * 2, false
      )
    })

    it('should call arc with counterclockwise on path', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        local path = canvas.create_path()
        path:arc(100, 100, 50, 0, math.pi, true)
      `)
      expect(mockController.pathArc).toHaveBeenCalledWith(
        1, 100, 100, 50, 0, Math.PI, true
      )
    })

    it('should call arc_to on path', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        local path = canvas.create_path()
        path:arc_to(100, 50, 150, 100, 20)
      `)
      expect(mockController.pathArcTo).toHaveBeenCalledWith(1, 100, 50, 150, 100, 20)
    })

    it('should call ellipse on path', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        local path = canvas.create_path()
        path:ellipse(100, 100, 50, 30, 0, 0, math.pi * 2)
      `)
      expect(mockController.pathEllipse).toHaveBeenCalledWith(
        1, 100, 100, 50, 30, 0, 0, Math.PI * 2, false
      )
    })

    it('should call quadratic_curve_to on path', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        local path = canvas.create_path()
        path:quadratic_curve_to(100, 50, 200, 100)
      `)
      expect(mockController.pathQuadraticCurveTo).toHaveBeenCalledWith(1, 100, 50, 200, 100)
    })

    it('should call bezier_curve_to on path', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        local path = canvas.create_path()
        path:bezier_curve_to(100, 50, 200, 150, 300, 100)
      `)
      expect(mockController.pathBezierCurveTo).toHaveBeenCalledWith(1, 100, 50, 200, 150, 300, 100)
    })

    it('should call add_path to combine paths', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        local path1 = canvas.create_path()
        local path2 = canvas.create_path()
        path1:add_path(path2)
      `)
      expect(mockController.pathAddPath).toHaveBeenCalledWith(1, 2)
    })

    it('should support method chaining', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        local path = canvas.create_path()
          :move_to(10, 10)
          :line_to(100, 10)
          :line_to(100, 100)
          :close_path()
      `)
      expect(mockController.pathMoveTo).toHaveBeenCalledWith(1, 10, 10)
      expect(mockController.pathLineTo).toHaveBeenCalledWith(1, 100, 10)
      expect(mockController.pathLineTo).toHaveBeenCalledWith(1, 100, 100)
      expect(mockController.pathClosePath).toHaveBeenCalledWith(1)
    })
  })

  describe('Path2D rendering', () => {
    it('should fill a Path2D', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        local path = canvas.create_path()
        path:rect(10, 10, 100, 100)
        canvas.fill(path)
      `)
      expect(mockController.fillPath).toHaveBeenCalledWith(1, undefined)
    })

    it('should fill a Path2D with fill rule', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        local path = canvas.create_path()
        path:rect(10, 10, 100, 100)
        canvas.fill(path, "evenodd")
      `)
      expect(mockController.fillPath).toHaveBeenCalledWith(1, 'evenodd')
    })

    it('should stroke a Path2D', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        local path = canvas.create_path()
        path:rect(10, 10, 100, 100)
        canvas.stroke(path)
      `)
      expect(mockController.strokePath).toHaveBeenCalledWith(1)
    })

    it('should clip to a Path2D', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        local path = canvas.create_path()
        path:arc(100, 100, 50, 0, math.pi * 2)
        canvas.clip(path)
      `)
      expect(mockController.clipPath).toHaveBeenCalledWith(1, undefined)
    })

    it('should clip to a Path2D with fill rule', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        local path = canvas.create_path()
        path:arc(100, 100, 50, 0, math.pi * 2)
        canvas.clip(path, "evenodd")
      `)
      expect(mockController.clipPath).toHaveBeenCalledWith(1, 'evenodd')
    })

    it('should still support fill without Path2D', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.begin_path()
        canvas.rect(10, 10, 100, 100)
        canvas.fill()
      `)
      expect(mockController.fill).toHaveBeenCalled()
    })

    it('should still support stroke without Path2D', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.begin_path()
        canvas.rect(10, 10, 100, 100)
        canvas.stroke()
      `)
      expect(mockController.stroke).toHaveBeenCalled()
    })
  })

  describe('Path2D hit testing', () => {
    it('should test point in Path2D', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      const result = await engine.doString(`
        local canvas = require('canvas')
        local path = canvas.create_path()
        path:rect(10, 10, 100, 100)
        return canvas.is_point_in_path(path, 50, 50)
      `)
      expect(mockController.isPointInStoredPath).toHaveBeenCalledWith(1, 50, 50, 'nonzero')
      expect(result).toBe(true)
    })

    it('should test point in Path2D with fill rule', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        local path = canvas.create_path()
        path:rect(10, 10, 100, 100)
        canvas.is_point_in_path(path, 50, 50, "evenodd")
      `)
      expect(mockController.isPointInStoredPath).toHaveBeenCalledWith(1, 50, 50, 'evenodd')
    })

    it('should test point in Path2D stroke', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      const result = await engine.doString(`
        local canvas = require('canvas')
        local path = canvas.create_path()
        path:rect(10, 10, 100, 100)
        return canvas.is_point_in_stroke(path, 10, 50)
      `)
      expect(mockController.isPointInStoredStroke).toHaveBeenCalledWith(1, 10, 50)
      expect(result).toBe(false)
    })
  })

  describe('Path2D complete workflow', () => {
    it('should support creating and rendering a complex path', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        -- Create a star path
        local star = canvas.create_path()
          :move_to(100, 10)
          :line_to(120, 70)
          :line_to(180, 70)
          :line_to(130, 110)
          :line_to(150, 170)
          :line_to(100, 130)
          :line_to(50, 170)
          :line_to(70, 110)
          :line_to(20, 70)
          :line_to(80, 70)
          :close_path()

        -- Fill and stroke the star
        canvas.set_color(255, 215, 0)
        canvas.fill(star)
        canvas.set_color(0, 0, 0)
        canvas.stroke(star)

        -- Clean up
        star:dispose()
      `)

      expect(mockController.pathMoveTo).toHaveBeenCalledWith(1, 100, 10)
      expect(mockController.pathClosePath).toHaveBeenCalledWith(1)
      expect(mockController.fillPath).toHaveBeenCalledWith(1, undefined)
      expect(mockController.strokePath).toHaveBeenCalledWith(1)
      expect(mockController.disposePath).toHaveBeenCalledWith(1)
    })

    it('should support SVG path string for complex shapes', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        -- Create path from SVG string (heart shape)
        local heart = canvas.create_path("M 100,30 C 40,30 0,90 100,170 C 200,90 160,30 100,30 Z")
        canvas.fill(heart)
      `)

      expect(mockController.createPath).toHaveBeenCalledWith(
        'M 100,30 C 40,30 0,90 100,170 C 200,90 160,30 100,30 Z'
      )
      expect(mockController.fillPath).toHaveBeenCalledWith(1, undefined)
    })
  })
})
