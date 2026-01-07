/**
 * Tests for canvas.capture() Lua API.
 * Tests snapshot functionality to get canvas as data URL.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LuaFactory, LuaEngine } from 'wasmoon'
import { setupCanvasAPI } from '../src/setupCanvasAPI'
import type { CanvasController } from '../src/CanvasController'

describe('setupCanvasAPI - capture', () => {
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
      // capture returns a data URL
      capture: vi.fn().mockReturnValue('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='),
      setReloadCallback: vi.fn(),
    } as unknown as CanvasController
  }

  describe('capture function', () => {
    it('should expose capture function via require', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      const result = await engine.doString(`
        local canvas = require('canvas')
        return type(canvas.capture)
      `)
      expect(result).toBe('function')
    })

    it('should call capture and return a data URL', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      const result = await engine.doString(`
        local canvas = require('canvas')
        return canvas.capture()
      `)

      expect(mockController.capture).toHaveBeenCalledTimes(1)
      expect(result).toMatch(/^data:image\/png;base64,/)
    })

    it('should call capture with PNG format option', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.capture({ format = "png" })
      `)

      expect(mockController.capture).toHaveBeenCalledWith('image/png', undefined)
    })

    it('should call capture with JPEG format option', async () => {
      const mockController = createMockController()
      ;(mockController.capture as ReturnType<typeof vi.fn>).mockReturnValue('data:image/jpeg;base64,/9j/4AAQ...')
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.capture({ format = "jpeg" })
      `)

      expect(mockController.capture).toHaveBeenCalledWith('image/jpeg', undefined)
    })

    it('should call capture with quality option for JPEG', async () => {
      const mockController = createMockController()
      ;(mockController.capture as ReturnType<typeof vi.fn>).mockReturnValue('data:image/jpeg;base64,/9j/4AAQ...')
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.capture({ format = "jpeg", quality = 0.8 })
      `)

      expect(mockController.capture).toHaveBeenCalledWith('image/jpeg', 0.8)
    })

    it('should call capture with webp format option', async () => {
      const mockController = createMockController()
      ;(mockController.capture as ReturnType<typeof vi.fn>).mockReturnValue('data:image/webp;base64,UklG...')
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        canvas.capture({ format = "webp", quality = 0.9 })
      `)

      expect(mockController.capture).toHaveBeenCalledWith('image/webp', 0.9)
    })

    it('should return empty string when capture fails', async () => {
      const mockController = createMockController()
      ;(mockController.capture as ReturnType<typeof vi.fn>).mockReturnValue('')
      setupCanvasAPI(engine, () => mockController)

      const result = await engine.doString(`
        local canvas = require('canvas')
        return canvas.capture()
      `)

      expect(result).toBe('')
    })
  })
})
