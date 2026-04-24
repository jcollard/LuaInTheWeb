/**
 * Tests for canvas <-> AudioAssetManager lifecycle coupling (core.ts).
 *
 * Regression: games built before the standalone `ail_audio` split registered
 * their audio through `canvas.assets.*`. After the split, those calls routed
 * to AudioAssetManager while canvas.start() only drove the canvas AssetManager,
 * so audio was never decoded and channel_play silently no-oped.
 *
 * The fix wires canvas.assets.add_path and canvas.start to also notify the
 * audio-side bridges when they exist, so the old API continues to work.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LuaFactory, LuaEngine } from 'wasmoon'
import { setupCanvasAPI } from '../src/setupCanvasAPI'
import type { CanvasController } from '../src/CanvasController'

function createMockController(): CanvasController {
  return {
    isActive: vi.fn().mockReturnValue(false),
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    addAssetPath: vi.fn(),
    loadImageAsset: vi.fn(),
    loadFontAsset: vi.fn(),
    getAssetManifest: vi.fn().mockReturnValue(new Map()),
    loadAssets: vi.fn().mockResolvedValue(undefined),
    getAssetWidth: vi.fn().mockReturnValue(0),
    getAssetHeight: vi.fn().mockReturnValue(0),
    setOnDrawCallback: vi.fn(),
    setReloadCallback: vi.fn(),
    getDelta: vi.fn().mockReturnValue(0),
    getTime: vi.fn().mockReturnValue(0),
    getWidth: vi.fn().mockReturnValue(0),
    getHeight: vi.fn().mockReturnValue(0),
    getKeysDown: vi.fn().mockReturnValue([]),
    getKeysPressed: vi.fn().mockReturnValue([]),
    isKeyDown: vi.fn().mockReturnValue(false),
    isKeyPressed: vi.fn().mockReturnValue(false),
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

describe('canvasLuaCode <-> audio asset lifecycle', () => {
  let engine: LuaEngine

  beforeEach(async () => {
    const factory = new LuaFactory()
    engine = await factory.createEngine()
  })

  afterEach(() => {
    engine.global.close()
  })

  it('canvas.assets.add_path mirrors the path to __audio_assets_addPath when registered', async () => {
    const audioAddPath = vi.fn()
    setupCanvasAPI(engine, () => createMockController())
    engine.global.set('__audio_assets_addPath', audioAddPath)

    await engine.doString(`
      local canvas = require('canvas')
      canvas.assets.add_path('assets/')
    `)

    expect(audioAddPath).toHaveBeenCalledTimes(1)
    expect(audioAddPath).toHaveBeenCalledWith('assets/')
  })

  it('canvas.assets.add_path does not error when __audio_assets_addPath is absent', async () => {
    setupCanvasAPI(engine, () => createMockController())
    // Intentionally do NOT set __audio_assets_addPath

    await expect(
      engine.doString(`
        local canvas = require('canvas')
        canvas.assets.add_path('assets/')
      `)
    ).resolves.not.toThrow()
  })

  it('canvas.start awaits __audio_assets_start before __canvas_start when registered', async () => {
    const order: string[] = []
    const audioStart = vi.fn().mockImplementation(() => {
      order.push('audio_start_called')
      return Promise.resolve().then(() => {
        order.push('audio_start_resolved')
      })
    })
    const canvasStart = vi.fn().mockImplementation(() => {
      order.push('canvas_start_called')
      return Promise.resolve()
    })

    setupCanvasAPI(engine, () => createMockController())
    engine.global.set('__audio_assets_start', audioStart)
    // Override __canvas_start to track ordering
    engine.global.set('__canvas_start', canvasStart)

    await engine.doString(`
      local canvas = require('canvas')
      canvas.start()
    `)

    expect(audioStart).toHaveBeenCalledTimes(1)
    expect(canvasStart).toHaveBeenCalledTimes(1)
    expect(order).toEqual([
      'audio_start_called',
      'audio_start_resolved',
      'canvas_start_called',
    ])
  })

  it('canvas.start does not error when __audio_assets_start is absent', async () => {
    setupCanvasAPI(engine, () => createMockController())
    // Intentionally do NOT set __audio_assets_start
    engine.global.set('__canvas_start', () => Promise.resolve())

    await expect(
      engine.doString(`
        local canvas = require('canvas')
        canvas.start()
      `)
    ).resolves.not.toThrow()
  })
})
