/**
 * Tests for pixel manipulation API (Issue #431)
 * Specifically tests that cached ImageData can be reused with put_image_data
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LuaFactory, LuaEngine } from 'wasmoon'
import { setupCanvasAPI } from '../src/setupCanvasAPI'
import type { CanvasController } from '../src/CanvasController'

describe('setupCanvasAPI - Pixel Manipulation', () => {
  let engine: LuaEngine
  let putImageDataSpy: ReturnType<typeof vi.fn>
  let capturedPutImageDataArgs: { data: number[]; width: number; height: number; dx: number; dy: number }[] = []

  beforeEach(async () => {
    const factory = new LuaFactory()
    engine = await factory.createEngine()
    capturedPutImageDataArgs = []
  })

  afterEach(() => {
    engine.global.close()
  })

  function createMockController(): CanvasController {
    putImageDataSpy = vi.fn((data: number[], width: number, height: number, dx: number, dy: number) => {
      capturedPutImageDataArgs.push({ data: [...data], width, height, dx, dy })
    })

    return {
      isActive: vi.fn().mockReturnValue(false),
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
      setOnDrawCallback: vi.fn(),
      clear: vi.fn(),
      setColor: vi.fn(),
      setLineWidth: vi.fn(),
      setSize: vi.fn(),
      getWidth: vi.fn().mockReturnValue(100),
      getHeight: vi.fn().mockReturnValue(100),
      // Pixel manipulation
      getImageData: vi.fn().mockReturnValue([
        // 2x2 red pixels (RGBA)
        255, 0, 0, 255,  // pixel (0,0)
        255, 0, 0, 255,  // pixel (1,0)
        255, 0, 0, 255,  // pixel (0,1)
        255, 0, 0, 255,  // pixel (1,1)
      ]),
      putImageData: putImageDataSpy,
      createImageData: vi.fn().mockReturnValue(new Array(16).fill(0)),
      // Other required methods
      getDelta: vi.fn().mockReturnValue(0.016),
      getTime: vi.fn().mockReturnValue(1.0),
      isKeyDown: vi.fn().mockReturnValue(false),
      isKeyPressed: vi.fn().mockReturnValue(false),
      getKeysDown: vi.fn().mockReturnValue([]),
      getKeysPressed: vi.fn().mockReturnValue([]),
      getMouseX: vi.fn().mockReturnValue(0),
      getMouseY: vi.fn().mockReturnValue(0),
      isMouseButtonDown: vi.fn().mockReturnValue(false),
      isMouseButtonPressed: vi.fn().mockReturnValue(false),
      drawRect: vi.fn(),
      fillRect: vi.fn(),
      drawCircle: vi.fn(),
      fillCircle: vi.fn(),
      drawLine: vi.fn(),
      drawText: vi.fn(),
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
    } as unknown as CanvasController
  }

  describe('get_image_data', () => {
    it('should return ImageData with correct pixel values', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      const result = await engine.doString(`
        local canvas = require('canvas')
        local img = canvas.get_image_data(0, 0, 2, 2)
        if img then
          local r, g, b, a = img:get_pixel(0, 0)
          return r .. "," .. g .. "," .. b .. "," .. a
        end
        return "nil"
      `)

      expect(result).toBe('255,0,0,255')
    })
  })

  describe('put_image_data with immediate use', () => {
    it('should pass correct data when called immediately after get_image_data', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        local img = canvas.get_image_data(0, 0, 2, 2)
        canvas.put_image_data(img, 10, 10)
      `)

      expect(putImageDataSpy).toHaveBeenCalledTimes(1)
      const args = capturedPutImageDataArgs[0]
      expect(args.width).toBe(2)
      expect(args.height).toBe(2)
      expect(args.dx).toBe(10)
      expect(args.dy).toBe(10)
      // First pixel should be red (255, 0, 0, 255)
      expect(args.data[0]).toBe(255)
      expect(args.data[1]).toBe(0)
      expect(args.data[2]).toBe(0)
      expect(args.data[3]).toBe(255)
    })
  })

  describe('put_image_data with CACHED ImageData', () => {
    it('should pass correct data when ImageData is stored and reused', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      // This test mimics the demo's caching pattern
      await engine.doString(`
        local canvas = require('canvas')

        -- Store ImageData in a local variable (like the demo does)
        local cached_img = canvas.get_image_data(0, 0, 2, 2)

        -- First put_image_data call (should work)
        canvas.put_image_data(cached_img, 10, 10)

        -- Second put_image_data call with SAME cached data (this is the bug!)
        canvas.put_image_data(cached_img, 20, 20)
      `)

      expect(putImageDataSpy).toHaveBeenCalledTimes(2)

      // First call should have correct data
      const firstCall = capturedPutImageDataArgs[0]
      expect(firstCall.data[0]).toBe(255) // Red
      expect(firstCall.dx).toBe(10)

      // Second call with cached data should ALSO have correct data
      const secondCall = capturedPutImageDataArgs[1]
      expect(secondCall.dx).toBe(20)
      // THIS IS THE BUG: If cached data shows zeros, the test will fail here
      expect(secondCall.data[0]).toBe(255) // Should still be red!
      expect(secondCall.data[1]).toBe(0)
      expect(secondCall.data[2]).toBe(0)
      expect(secondCall.data[3]).toBe(255)
    })

    it('should work when ImageData is stored in a table', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')

        -- Store in a table (like cached_effects[mode] in the demo)
        local cache = {}
        cache[1] = canvas.get_image_data(0, 0, 2, 2)

        -- Use cached data
        canvas.put_image_data(cache[1], 30, 30)
      `)

      expect(putImageDataSpy).toHaveBeenCalledTimes(1)
      const args = capturedPutImageDataArgs[0]
      expect(args.data[0]).toBe(255) // Should be red
    })
  })

  describe('create_image_data', () => {
    it('should create ImageData that can be modified and used with put_image_data', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        local img = canvas.create_image_data(2, 2)
        img:set_pixel(0, 0, 128, 64, 32, 255)
        canvas.put_image_data(img, 0, 0)
      `)

      expect(putImageDataSpy).toHaveBeenCalledTimes(1)
      const args = capturedPutImageDataArgs[0]
      // First pixel should be the color we set
      expect(args.data[0]).toBe(128)
      expect(args.data[1]).toBe(64)
      expect(args.data[2]).toBe(32)
      expect(args.data[3]).toBe(255)
    })
  })

  describe('clone_image_data', () => {
    it('should clone ImageData with same pixel values', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      const result = await engine.doString(`
        local canvas = require('canvas')
        local original = canvas.create_image_data(2, 2)
        original:set_pixel(0, 0, 100, 150, 200, 255)

        local clone = canvas.clone_image_data(original)

        -- Verify clone has same dimensions
        if clone.width ~= original.width or clone.height ~= original.height then
          return "dimension_mismatch"
        end

        -- Verify clone has same pixel values
        local r, g, b, a = clone:get_pixel(0, 0)
        return r .. "," .. g .. "," .. b .. "," .. a
      `)

      expect(result).toBe('100,150,200,255')
    })

    it('should create independent copy - modifying clone should not affect original', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      const result = await engine.doString(`
        local canvas = require('canvas')
        local original = canvas.create_image_data(2, 2)
        original:set_pixel(0, 0, 100, 150, 200, 255)

        local clone = canvas.clone_image_data(original)
        clone:set_pixel(0, 0, 50, 60, 70, 80)

        -- Original should still have original values
        local r, g, b, a = original:get_pixel(0, 0)
        return r .. "," .. g .. "," .. b .. "," .. a
      `)

      expect(result).toBe('100,150,200,255')
    })

    it('should create new ID for cloned ImageData', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      const result = await engine.doString(`
        local canvas = require('canvas')
        local original = canvas.create_image_data(2, 2)
        local clone = canvas.clone_image_data(original)

        -- IDs should be different (internal _jsId)
        if original._jsId == clone._jsId then
          return "same_id"
        end
        return "different_id"
      `)

      expect(result).toBe('different_id')
    })
  })
})
