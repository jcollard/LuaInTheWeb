/**
 * Tests for setupCanvasAPI - canvas module pattern.
 * Verifies that canvas is NOT a global and must be accessed via require('canvas').
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
          'start', 'stop', 'on_draw',
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
})
