/**
 * Tests for setupCanvasAPI - asset API.
 * Tests asset path registration, image/font loading, and drawing functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LuaFactory, LuaEngine } from 'wasmoon'
import { setupCanvasAPI } from '../src/setupCanvasAPI'
import type { CanvasController } from '../src/CanvasController'

describe('setupCanvasAPI - asset API', () => {
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
      setDirection: vi.fn(),
      setFilter: vi.fn(),
      setReloadCallback: vi.fn(),
    } as unknown as CanvasController
  }

  it('should expose canvas.assets table via require', async () => {
    const mockController = createMockController()
    setupCanvasAPI(engine, () => mockController)

    const result = await engine.doString(`
      local canvas = require('canvas')
      return type(canvas.assets)
    `)
    expect(result).toBe('table')
  })

  it('should expose canvas.assets.add_path function', async () => {
    const mockController = createMockController()
    setupCanvasAPI(engine, () => mockController)

    const result = await engine.doString(`
      local canvas = require('canvas')
      return type(canvas.assets.add_path)
    `)
    expect(result).toBe('function')
  })

  it('should call addAssetPath when canvas.assets.add_path() is called', async () => {
    const mockController = createMockController()
    setupCanvasAPI(engine, () => mockController)

    await engine.doString(`
      local canvas = require('canvas')
      canvas.assets.add_path('images')
    `)

    expect(mockController.addAssetPath).toHaveBeenCalledWith('images')
  })

  it('should expose canvas.assets.load_image function', async () => {
    const mockController = createMockController()
    setupCanvasAPI(engine, () => mockController)

    const result = await engine.doString(`
      local canvas = require('canvas')
      return type(canvas.assets.load_image)
    `)
    expect(result).toBe('function')
  })

  it('should call loadImageAsset when canvas.assets.load_image() is called', async () => {
    const mockController = createMockController()
    setupCanvasAPI(engine, () => mockController)

    await engine.doString(`
      local canvas = require('canvas')
      canvas.assets.load_image('player', 'player.png')
    `)

    expect(mockController.loadImageAsset).toHaveBeenCalledWith('player', 'player.png')
  })

  it('should expose canvas.assets.load_font function', async () => {
    const mockController = createMockController()
    setupCanvasAPI(engine, () => mockController)

    const result = await engine.doString(`
      local canvas = require('canvas')
      return type(canvas.assets.load_font)
    `)
    expect(result).toBe('function')
  })

  it('should call loadFontAsset when canvas.assets.load_font() is called', async () => {
    const mockController = createMockController()
    setupCanvasAPI(engine, () => mockController)

    await engine.doString(`
      local canvas = require('canvas')
      canvas.assets.load_font('GameFont', 'pixel.ttf')
    `)

    expect(mockController.loadFontAsset).toHaveBeenCalledWith('GameFont', 'pixel.ttf')
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

    expect(mockController.drawImage).toHaveBeenCalledWith('player', 100, 200, undefined, undefined, undefined, undefined, undefined, undefined)
  })

  it('should call drawImage with scaling when width and height provided', async () => {
    const mockController = createMockController()
    setupCanvasAPI(engine, () => mockController)

    await engine.doString(`
      local canvas = require('canvas')
      canvas.draw_image('player', 100, 200, 64, 64)
    `)

    expect(mockController.drawImage).toHaveBeenCalledWith('player', 100, 200, 64, 64, undefined, undefined, undefined, undefined)
  })

  it('should call drawImage with source cropping (9-arg form)', async () => {
    const mockController = createMockController()
    setupCanvasAPI(engine, () => mockController)

    await engine.doString(`
      local canvas = require('canvas')
      canvas.draw_image('spritesheet', 100, 200, 64, 64, 0, 32, 32, 32)
    `)

    expect(mockController.drawImage).toHaveBeenCalledWith('spritesheet', 100, 200, 64, 64, 0, 32, 32, 32)
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
