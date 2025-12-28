/**
 * Tests for put_image_data with dirty rect (sub-region) parameters.
 * Verifies that only a portion of the ImageData can be drawn to the canvas.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LuaFactory, LuaEngine } from 'wasmoon'
import { setupCanvasAPI } from '../src/setupCanvasAPI'
import type { CanvasController } from '../src/CanvasController'

describe('setupCanvasAPI - put_image_data dirty rect', () => {
  let engine: LuaEngine
  let putImageDataSpy: ReturnType<typeof vi.fn>
  let capturedArgs: {
    data: number[]
    width: number
    height: number
    dx: number
    dy: number
    dirtyX?: number
    dirtyY?: number
    dirtyWidth?: number
    dirtyHeight?: number
  }[] = []

  beforeEach(async () => {
    const factory = new LuaFactory()
    engine = await factory.createEngine()
    capturedArgs = []
  })

  afterEach(() => {
    engine.global.close()
  })

  function createMockController(): CanvasController {
    putImageDataSpy = vi.fn((
      data: number[],
      width: number,
      height: number,
      dx: number,
      dy: number,
      dirtyX?: number,
      dirtyY?: number,
      dirtyWidth?: number,
      dirtyHeight?: number
    ) => {
      capturedArgs.push({ data: [...data], width, height, dx, dy, dirtyX, dirtyY, dirtyWidth, dirtyHeight })
    })

    return {
      isActive: vi.fn().mockReturnValue(false),
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
      setOnDrawCallback: vi.fn(),
      // Create a 4x4 image (64 pixels, 256 values)
      getImageData: vi.fn().mockReturnValue(new Array(4 * 4 * 4).fill(128)),
      putImageData: putImageDataSpy,
      createImageData: vi.fn().mockReturnValue(new Array(4 * 4 * 4).fill(0)),
      // Other required methods
      getDelta: vi.fn().mockReturnValue(0.016),
      getTime: vi.fn().mockReturnValue(1.0),
      isKeyDown: vi.fn().mockReturnValue(false),
      isKeyPressed: vi.fn().mockReturnValue(false),
    } as unknown as CanvasController
  }

  describe('put_image_data with dirty rect', () => {
    it('should call putImageData with all dirty rect parameters', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        local img = canvas.create_image_data(4, 4)
        -- Call put_image_data with dirty rect: only draw 2x2 region starting at (1,1)
        canvas.put_image_data(img, 10, 20, { dirty_x = 1, dirty_y = 1, dirty_width = 2, dirty_height = 2 })
      `)

      expect(putImageDataSpy).toHaveBeenCalledTimes(1)
      const args = capturedArgs[0]
      expect(args.dx).toBe(10)
      expect(args.dy).toBe(20)
      expect(args.dirtyX).toBe(1)
      expect(args.dirtyY).toBe(1)
      expect(args.dirtyWidth).toBe(2)
      expect(args.dirtyHeight).toBe(2)
    })

    it('should support partial dirty rect (only dirty_x and dirty_y)', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        local img = canvas.create_image_data(4, 4)
        canvas.put_image_data(img, 0, 0, { dirty_x = 2, dirty_y = 2 })
      `)

      expect(putImageDataSpy).toHaveBeenCalledTimes(1)
      const args = capturedArgs[0]
      expect(args.dirtyX).toBe(2)
      expect(args.dirtyY).toBe(2)
      expect(args.dirtyWidth).toBeUndefined()
      expect(args.dirtyHeight).toBeUndefined()
    })

    it('should support partial dirty rect (only dirty_width and dirty_height)', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        local img = canvas.create_image_data(4, 4)
        canvas.put_image_data(img, 0, 0, { dirty_width = 3, dirty_height = 3 })
      `)

      expect(putImageDataSpy).toHaveBeenCalledTimes(1)
      const args = capturedArgs[0]
      expect(args.dirtyX).toBeUndefined()
      expect(args.dirtyY).toBeUndefined()
      expect(args.dirtyWidth).toBe(3)
      expect(args.dirtyHeight).toBe(3)
    })

    it('should work without dirty rect (backward compatibility)', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        local img = canvas.create_image_data(4, 4)
        canvas.put_image_data(img, 5, 10)
      `)

      expect(putImageDataSpy).toHaveBeenCalledTimes(1)
      const args = capturedArgs[0]
      expect(args.dx).toBe(5)
      expect(args.dy).toBe(10)
      expect(args.dirtyX).toBeUndefined()
      expect(args.dirtyY).toBeUndefined()
      expect(args.dirtyWidth).toBeUndefined()
      expect(args.dirtyHeight).toBeUndefined()
    })

    it('should accept zero values for dirty rect parameters', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        local img = canvas.create_image_data(4, 4)
        canvas.put_image_data(img, 0, 0, { dirty_x = 0, dirty_y = 0, dirty_width = 0, dirty_height = 0 })
      `)

      expect(putImageDataSpy).toHaveBeenCalledTimes(1)
      const args = capturedArgs[0]
      expect(args.dirtyX).toBe(0)
      expect(args.dirtyY).toBe(0)
      expect(args.dirtyWidth).toBe(0)
      expect(args.dirtyHeight).toBe(0)
    })

    it('should handle empty options table as no dirty rect', async () => {
      const mockController = createMockController()
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        local img = canvas.create_image_data(4, 4)
        canvas.put_image_data(img, 0, 0, {})
      `)

      expect(putImageDataSpy).toHaveBeenCalledTimes(1)
      const args = capturedArgs[0]
      expect(args.dirtyX).toBeUndefined()
      expect(args.dirtyY).toBeUndefined()
      expect(args.dirtyWidth).toBeUndefined()
      expect(args.dirtyHeight).toBeUndefined()
    })
  })
})
