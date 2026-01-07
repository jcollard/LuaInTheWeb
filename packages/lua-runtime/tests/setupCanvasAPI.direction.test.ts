/**
 * Tests for set_direction (RTL/LTR text) canvas API.
 * Tests the text direction property for internationalization support.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LuaFactory, LuaEngine } from 'wasmoon'
import { setupCanvasAPI } from '../src/setupCanvasAPI'
import type { CanvasController } from '../src/CanvasController'

describe('setupCanvasAPI - set_direction', () => {
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
      // New method being tested
      setDirection: vi.fn(),
      setReloadCallback: vi.fn(),
    } as unknown as CanvasController
  }

  describe('set_direction function', () => {
    it('should expose set_direction function via require', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      const result = await engine.doString(`
        local canvas = require('canvas')
        return type(canvas.set_direction)
      `)
      expect(result).toBe('function')
    })

    it('should call setDirection with "ltr" direction', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.set_direction("ltr")
      `)

      expect(mockController.setDirection).toHaveBeenCalledWith('ltr')
    })

    it('should call setDirection with "rtl" direction', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.set_direction("rtl")
      `)

      expect(mockController.setDirection).toHaveBeenCalledWith('rtl')
    })

    it('should call setDirection with "inherit" direction', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.set_direction("inherit")
      `)

      expect(mockController.setDirection).toHaveBeenCalledWith('inherit')
    })

    it('should not call setDirection when controller is not active', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => null)

      // Should not throw when controller is null
      await engine.doString(`
        local canvas = require('canvas')
        canvas.set_direction("rtl")
      `)

      expect(mockController.setDirection).not.toHaveBeenCalled()
    })
  })
})
