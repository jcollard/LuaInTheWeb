/**
 * Tests for input.ts Lua code array caching.
 * Verifies that get_keys_down() and get_keys_pressed() cache their results
 * to reduce GC pressure (#608).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LuaFactory, LuaEngine } from 'wasmoon'
import { setupCanvasAPI } from '../src/setupCanvasAPI'
import type { CanvasController } from '../src/CanvasController'

describe('canvasLuaCode input caching', () => {
  let engine: LuaEngine

  beforeEach(async () => {
    const factory = new LuaFactory()
    engine = await factory.createEngine()
  })

  afterEach(() => {
    engine.global.close()
  })

  // Create a mock controller with controllable key arrays
  function createMockController(options: {
    getKeysDown?: () => string[]
    getKeysPressed?: () => string[]
  } = {}): CanvasController {
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
      getKeysDown: options.getKeysDown ?? vi.fn().mockReturnValue([]),
      getKeysPressed: options.getKeysPressed ?? vi.fn().mockReturnValue([]),
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
      loadImageAsset: vi.fn(),
      loadFontAsset: vi.fn(),
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
      setReloadCallback: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
    } as unknown as CanvasController
  }

  describe('get_keys_down caching', () => {
    it('should return the same table reference when JS array unchanged', async () => {
      // Same array instance returned each time (simulates issue #597 caching)
      const keysArray = ['KeyA', 'KeyB']
      const mockController = createMockController({
        getKeysDown: vi.fn().mockReturnValue(keysArray),
      })
      setupCanvasAPI(engine, () => mockController)

      // Call get_keys_down twice and check if same table reference
      const result = await engine.doString(`
        local canvas = require('canvas')
        local t1 = canvas.get_keys_down()
        local t2 = canvas.get_keys_down()
        return rawequal(t1, t2)
      `)
      expect(result).toBe(true)
    })

    it('should update cached table when JS array changes', async () => {
      let keysArray: string[] = ['KeyA']
      const mockController = createMockController({
        getKeysDown: vi.fn().mockImplementation(() => keysArray),
      })
      setupCanvasAPI(engine, () => mockController)

      // First call
      const result1 = await engine.doString(`
        local canvas = require('canvas')
        local t = canvas.get_keys_down()
        return t[1]
      `)
      expect(result1).toBe('KeyA')

      // Change the array
      keysArray = ['KeyB', 'KeyC']

      // Second call should have updated values
      const result2 = await engine.doString(`
        local canvas = require('canvas')
        local t = canvas.get_keys_down()
        return t[1] .. ',' .. t[2]
      `)
      expect(result2).toBe('KeyB,KeyC')
    })

    it('should return same table reference even after array content changes', async () => {
      let keysArray: string[] = ['KeyA']
      const mockController = createMockController({
        getKeysDown: vi.fn().mockImplementation(() => keysArray),
      })
      setupCanvasAPI(engine, () => mockController)

      // Store the first table reference and change array
      const result = await engine.doString(`
        local canvas = require('canvas')
        _G.first_table = canvas.get_keys_down()
        return true
      `)
      expect(result).toBe(true)

      // Change array
      keysArray = ['KeyB']

      // The table reference should be the same (reused, but with updated content)
      const sameRef = await engine.doString(`
        local canvas = require('canvas')
        local second_table = canvas.get_keys_down()
        return rawequal(_G.first_table, second_table)
      `)
      expect(sameRef).toBe(true)
    })

    it('should handle empty arrays', async () => {
      const keysArray: string[] = []
      const mockController = createMockController({
        getKeysDown: vi.fn().mockReturnValue(keysArray),
      })
      setupCanvasAPI(engine, () => mockController)

      const result = await engine.doString(`
        local canvas = require('canvas')
        local t = canvas.get_keys_down()
        return #t
      `)
      expect(result).toBe(0)
    })

    it('should clear stale entries when array shrinks', async () => {
      let keysArray: string[] = ['KeyA', 'KeyB', 'KeyC']
      const mockController = createMockController({
        getKeysDown: vi.fn().mockImplementation(() => keysArray),
      })
      setupCanvasAPI(engine, () => mockController)

      // First call with 3 keys
      await engine.doString(`
        local canvas = require('canvas')
        _G.t = canvas.get_keys_down()
      `)

      // Shrink to 1 key
      keysArray = ['KeyX']

      // Second call - should have only 1 entry
      const result = await engine.doString(`
        local canvas = require('canvas')
        local t = canvas.get_keys_down()
        return #t .. ':' .. t[1] .. ':' .. tostring(t[2])
      `)
      expect(result).toBe('1:KeyX:nil')
    })
  })

  describe('get_keys_pressed caching', () => {
    it('should return the same table reference when JS array unchanged', async () => {
      const keysArray = ['KeyA']
      const mockController = createMockController({
        getKeysPressed: vi.fn().mockReturnValue(keysArray),
      })
      setupCanvasAPI(engine, () => mockController)

      const result = await engine.doString(`
        local canvas = require('canvas')
        local t1 = canvas.get_keys_pressed()
        local t2 = canvas.get_keys_pressed()
        return rawequal(t1, t2)
      `)
      expect(result).toBe(true)
    })

    it('should update cached table when JS array changes', async () => {
      let keysArray: string[] = ['KeyA']
      const mockController = createMockController({
        getKeysPressed: vi.fn().mockImplementation(() => keysArray),
      })
      setupCanvasAPI(engine, () => mockController)

      const result1 = await engine.doString(`
        local canvas = require('canvas')
        local t = canvas.get_keys_pressed()
        return t[1]
      `)
      expect(result1).toBe('KeyA')

      keysArray = ['KeyB']

      const result2 = await engine.doString(`
        local canvas = require('canvas')
        local t = canvas.get_keys_pressed()
        return t[1]
      `)
      expect(result2).toBe('KeyB')
    })

    it('should return same table reference even after array content changes', async () => {
      let keysArray: string[] = ['KeyA']
      const mockController = createMockController({
        getKeysPressed: vi.fn().mockImplementation(() => keysArray),
      })
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        _G.first_table = canvas.get_keys_pressed()
      `)

      keysArray = ['KeyB']

      const sameRef = await engine.doString(`
        local canvas = require('canvas')
        local second_table = canvas.get_keys_pressed()
        return rawequal(_G.first_table, second_table)
      `)
      expect(sameRef).toBe(true)
    })

    it('should handle empty arrays', async () => {
      const keysArray: string[] = []
      const mockController = createMockController({
        getKeysPressed: vi.fn().mockReturnValue(keysArray),
      })
      setupCanvasAPI(engine, () => mockController)

      const result = await engine.doString(`
        local canvas = require('canvas')
        local t = canvas.get_keys_pressed()
        return #t
      `)
      expect(result).toBe(0)
    })

    it('should clear stale entries when array shrinks', async () => {
      let keysArray: string[] = ['KeyA', 'KeyB', 'KeyC']
      const mockController = createMockController({
        getKeysPressed: vi.fn().mockImplementation(() => keysArray),
      })
      setupCanvasAPI(engine, () => mockController)

      await engine.doString(`
        local canvas = require('canvas')
        _G.t = canvas.get_keys_pressed()
      `)

      keysArray = ['KeyX']

      const result = await engine.doString(`
        local canvas = require('canvas')
        local t = canvas.get_keys_pressed()
        return #t .. ':' .. t[1] .. ':' .. tostring(t[2])
      `)
      expect(result).toBe('1:KeyX:nil')
    })
  })
})
