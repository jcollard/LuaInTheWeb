/**
 * Tests for setupCanvasAPI - canvas module pattern.
 * Verifies that canvas is NOT a global and must be accessed via require('canvas').
 * Path API tests are in setupCanvasAPI.path.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LuaFactory, LuaEngine } from 'wasmoon'
import { setupCanvasAPI } from '../src/setupCanvasAPI'
import type { CanvasController } from '../src/CanvasController'

describe('setupCanvasAPI', () => {
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
      // Asset API methods
      registerAsset: vi.fn(),
      getAssetManifest: vi.fn().mockReturnValue(new Map()),
      loadAssets: vi.fn().mockResolvedValue(undefined),
      drawImage: vi.fn(),
      getAssetWidth: vi.fn().mockReturnValue(64),
      getAssetHeight: vi.fn().mockReturnValue(64),
      // Transformation API methods
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
    } as unknown as CanvasController
  }

  describe('canvas is NOT a global', () => {
    it('should not expose canvas as a global variable', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      // Try to access canvas as a global - should be nil
      const result = await engine.doString('return type(canvas)')
      expect(result).toBe('nil')
    })

    it('should error when trying to call canvas.clear() without require', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      // Try to call canvas.clear() without require - should error
      await expect(
        engine.doString('canvas.clear()')
      ).rejects.toThrow()
    })
  })

  describe('require("canvas") module pattern', () => {
    it('should return the canvas module via require', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      // require('canvas') should return a table
      const result = await engine.doString(`
        local canvas = require('canvas')
        return type(canvas)
      `)
      expect(result).toBe('table')
    })

    it('should expose canvas.clear function via require', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      const result = await engine.doString(`
        local canvas = require('canvas')
        return type(canvas.clear)
      `)
      expect(result).toBe('function')
    })

    it('should expose all drawing functions via require', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      const result = await engine.doString(`
        local canvas = require('canvas')
        local functions = {
          'start', 'stop', 'tick',
          'set_size', 'get_width', 'get_height',
          'clear', 'set_color', 'set_line_width',
          'draw_rect', 'fill_rect', 'draw_circle', 'fill_circle',
          'draw_line', 'draw_text',
          'get_delta', 'get_time',
          'is_key_down', 'is_key_pressed', 'get_keys_down', 'get_keys_pressed',
          'get_mouse_x', 'get_mouse_y', 'is_mouse_down', 'is_mouse_pressed'
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

    it('should expose canvas.keys table via require', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      const result = await engine.doString(`
        local canvas = require('canvas')
        return type(canvas.keys)
      `)
      expect(result).toBe('table')
    })

    it('should have common key constants in canvas.keys', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      const result = await engine.doString(`
        local canvas = require('canvas')
        return canvas.keys.SPACE == 'Space' and
               canvas.keys.ENTER == 'Enter' and
               canvas.keys.W == 'KeyW'
      `)
      expect(result).toBe(true)
    })

    it('should cache the module on multiple requires', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      const result = await engine.doString(`
        local canvas1 = require('canvas')
        local canvas2 = require('canvas')
        return canvas1 == canvas2
      `)
      expect(result).toBe(true)
    })
  })

  describe('canvas API functionality via require', () => {
    it('should call clear on controller when canvas.clear() is called', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.clear()
      `)

      expect(mockController.clear).toHaveBeenCalled()
    })

    it('should call setColor on controller with correct arguments', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.set_color(255, 128, 64)
      `)

      expect(mockController.setColor).toHaveBeenCalledWith(255, 128, 64, undefined)
    })

    it('should call setColor with alpha when provided', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.set_color(255, 128, 64, 200)
      `)

      expect(mockController.setColor).toHaveBeenCalledWith(255, 128, 64, 200)
    })

    it('should call fillRect with correct arguments', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.fill_rect(10, 20, 100, 50)
      `)

      expect(mockController.fillRect).toHaveBeenCalledWith(10, 20, 100, 50)
    })

    it('should return timing values from controller', async () => {
      const mockController = createMockController()
      ;(mockController.getDelta as ReturnType<typeof vi.fn>).mockReturnValue(0.016)
      ;(mockController.getTime as ReturnType<typeof vi.fn>).mockReturnValue(5.5)
      setupCanvasAPI(engine, () => mockController)

      const deltaResult = await engine.doString(`
        local canvas = require('canvas')
        return canvas.get_delta()
      `)
      const timeResult = await engine.doString(`
        local canvas = require('canvas')
        return canvas.get_time()
      `)

      expect(deltaResult).toBe(0.016)
      expect(timeResult).toBe(5.5)
    })

    it('should return canvas dimensions from controller', async () => {
      const mockController = createMockController()
      ;(mockController.getWidth as ReturnType<typeof vi.fn>).mockReturnValue(800)
      ;(mockController.getHeight as ReturnType<typeof vi.fn>).mockReturnValue(600)
      setupCanvasAPI(engine, () => mockController)

      const widthResult = await engine.doString(`
        local canvas = require('canvas')
        return canvas.get_width()
      `)
      const heightResult = await engine.doString(`
        local canvas = require('canvas')
        return canvas.get_height()
      `)

      expect(widthResult).toBe(800)
      expect(heightResult).toBe(600)
    })
  })

  describe('key normalization', () => {
    it('should normalize single letter keys to KeyX format', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.is_key_down('w')
      `)

      expect(mockController.isKeyDown).toHaveBeenCalledWith('KeyW')
    })

    it('should normalize "space" to "Space"', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.is_key_down('space')
      `)

      expect(mockController.isKeyDown).toHaveBeenCalledWith('Space')
    })

    it('should normalize arrow key names', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.is_key_down('up')
        canvas.is_key_down('down')
        canvas.is_key_down('left')
        canvas.is_key_down('right')
      `)

      expect(mockController.isKeyDown).toHaveBeenCalledWith('ArrowUp')
      expect(mockController.isKeyDown).toHaveBeenCalledWith('ArrowDown')
      expect(mockController.isKeyDown).toHaveBeenCalledWith('ArrowLeft')
      expect(mockController.isKeyDown).toHaveBeenCalledWith('ArrowRight')
    })

    it('should pass through already-normalized key codes', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.is_key_down('KeyW')
        canvas.is_key_down('ArrowUp')
        canvas.is_key_down('Space')
      `)

      expect(mockController.isKeyDown).toHaveBeenCalledWith('KeyW')
      expect(mockController.isKeyDown).toHaveBeenCalledWith('ArrowUp')
      expect(mockController.isKeyDown).toHaveBeenCalledWith('Space')
    })
  })

  describe('asset API', () => {
    it('should expose canvas.assets table via require', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      const result = await engine.doString(`
        local canvas = require('canvas')
        return type(canvas.assets)
      `)
      expect(result).toBe('table')
    })

    it('should expose canvas.assets.image function', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      const result = await engine.doString(`
        local canvas = require('canvas')
        return type(canvas.assets.image)
      `)
      expect(result).toBe('function')
    })

    it('should call registerAsset when canvas.assets.image() is called', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.assets.image('player', 'sprites/player.png')
      `)

      expect(mockController.registerAsset).toHaveBeenCalledWith('player', 'sprites/player.png')
    })

    it('should expose canvas.draw_image function', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      const result = await engine.doString(`
        local canvas = require('canvas')
        return type(canvas.draw_image)
      `)
      expect(result).toBe('function')
    })

    it('should call drawImage when canvas.draw_image() is called', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.draw_image('player', 100, 200)
      `)

      expect(mockController.drawImage).toHaveBeenCalledWith('player', 100, 200, undefined, undefined)
    })

    it('should call drawImage with scaling when width and height provided', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.draw_image('player', 100, 200, 64, 64)
      `)

      expect(mockController.drawImage).toHaveBeenCalledWith('player', 100, 200, 64, 64)
    })

    it('should expose canvas.assets.get_width function', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      const result = await engine.doString(`
        local canvas = require('canvas')
        return type(canvas.assets.get_width)
      `)
      expect(result).toBe('function')
    })

    it('should call getAssetWidth when canvas.assets.get_width() is called', async () => {
      const mockController = createMockController()
      ;(mockController.getAssetWidth as ReturnType<typeof vi.fn>).mockReturnValue(128)
      setupCanvasAPI(engine, () => mockController)

      const result = await engine.doString(`
        local canvas = require('canvas')
        return canvas.assets.get_width('player')
      `)

      expect(mockController.getAssetWidth).toHaveBeenCalledWith('player')
      expect(result).toBe(128)
    })

    it('should expose canvas.assets.get_height function', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      const result = await engine.doString(`
        local canvas = require('canvas')
        return type(canvas.assets.get_height)
      `)
      expect(result).toBe('function')
    })

    it('should call getAssetHeight when canvas.assets.get_height() is called', async () => {
      const mockController = createMockController()
      ;(mockController.getAssetHeight as ReturnType<typeof vi.fn>).mockReturnValue(96)
      setupCanvasAPI(engine, () => mockController)

      const result = await engine.doString(`
        local canvas = require('canvas')
        return canvas.assets.get_height('player')
      `)

      expect(mockController.getAssetHeight).toHaveBeenCalledWith('player')
      expect(result).toBe(96)
    })
  })

  // Note: Hex color tests are in setupCanvasAPI.hexColor.test.ts

  describe('transformation API', () => {
    it('should expose all transformation functions via require', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      const result = await engine.doString(`
        local canvas = require('canvas')
        local functions = {
          'translate', 'rotate', 'scale',
          'save', 'restore',
          'transform', 'set_transform', 'reset_transform'
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

    it('should call translate on controller with correct arguments', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.translate(100, 50)
      `)

      expect(mockController.translate).toHaveBeenCalledWith(100, 50)
    })

    it('should call rotate on controller with correct angle', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.rotate(math.pi / 4)
      `)

      expect(mockController.rotate).toHaveBeenCalledWith(Math.PI / 4)
    })

    it('should call scale on controller with correct factors', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.scale(2, 3)
      `)

      expect(mockController.scale).toHaveBeenCalledWith(2, 3)
    })

    it('should call save on controller', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.save()
      `)

      expect(mockController.save).toHaveBeenCalled()
    })

    it('should call restore on controller', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.restore()
      `)

      expect(mockController.restore).toHaveBeenCalled()
    })

    it('should call transform on controller with all 6 matrix values', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.transform(1, 0, 0, 1, 100, 50)
      `)

      expect(mockController.transform).toHaveBeenCalledWith(1, 0, 0, 1, 100, 50)
    })

    it('should call setTransform on controller with all 6 matrix values', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.set_transform(2, 0, 0, 2, 50, 50)
      `)

      expect(mockController.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 50, 50)
    })

    it('should call resetTransform on controller', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.reset_transform()
      `)

      expect(mockController.resetTransform).toHaveBeenCalled()
    })

    it('should support typical save/translate/rotate/restore workflow', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.save()
        canvas.translate(100, 100)
        canvas.rotate(math.pi / 4)
        canvas.fill_rect(-25, -25, 50, 50)
        canvas.restore()
      `)

      expect(mockController.save).toHaveBeenCalled()
      expect(mockController.translate).toHaveBeenCalledWith(100, 100)
      expect(mockController.rotate).toHaveBeenCalledWith(Math.PI / 4)
      expect(mockController.fillRect).toHaveBeenCalledWith(-25, -25, 50, 50)
      expect(mockController.restore).toHaveBeenCalled()
    })
  })
})
