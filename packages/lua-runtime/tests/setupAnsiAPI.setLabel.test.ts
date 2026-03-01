/**
 * Tests for screen:set_label() and ansi.create_label() - round-trip through JS bridge.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LuaFactory, LuaEngine } from 'wasmoon'
import { setupAnsiAPI } from '../src/setupAnsiAPI'
import type { AnsiController } from '../src/AnsiController'
import type { RGBColor } from '../src/screenTypes'

function createMockController(): AnsiController {
  let nextId = 1
  return {
    isActive: vi.fn().mockReturnValue(false),
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    setOnTickCallback: vi.fn(),
    write: vi.fn(),
    setCursor: vi.fn(),
    clear: vi.fn(),
    setForeground: vi.fn(),
    setBackground: vi.fn(),
    reset: vi.fn(),
    getDelta: vi.fn().mockReturnValue(0),
    getTime: vi.fn().mockReturnValue(0),
    isKeyDown: vi.fn().mockReturnValue(false),
    isKeyPressed: vi.fn().mockReturnValue(false),
    getKeysDown: vi.fn().mockReturnValue([]),
    getKeysPressed: vi.fn().mockReturnValue([]),
    getMouseCol: vi.fn().mockReturnValue(1),
    getMouseRow: vi.fn().mockReturnValue(1),
    isMouseTopHalf: vi.fn().mockReturnValue(false),
    getMouseX: vi.fn().mockReturnValue(0),
    getMouseY: vi.fn().mockReturnValue(0),
    isMouseButtonDown: vi.fn().mockReturnValue(false),
    isMouseButtonPressed: vi.fn().mockReturnValue(false),
    createScreen: vi.fn().mockImplementation(() => nextId++),
    setScreen: vi.fn(),
    getActiveScreenId: vi.fn().mockReturnValue(null),
    getScreenLayers: vi.fn().mockReturnValue([]),
    setScreenLayerVisible: vi.fn(),
    toggleScreenLayer: vi.fn(),
    screenPlay: vi.fn(),
    screenPause: vi.fn(),
    screenIsPlaying: vi.fn().mockReturnValue(false),
    setScreenLabel: vi.fn(),
  } as unknown as AnsiController
}

describe('setupAnsiAPI set_label bridge', () => {
  let engine: LuaEngine
  let controller: AnsiController

  beforeEach(async () => {
    const factory = new LuaFactory()
    engine = await factory.createEngine()
    controller = createMockController()
    setupAnsiAPI(engine, () => controller)
  })

  afterEach(() => {
    engine.global.close()
  })

  it('set_label with plain string calls controller.setScreenLabel without colors', async () => {
    await engine.doString(`
      local ansi = require("ansi")
      local screen = ansi.create_screen({ version = 1, width = 80, height = 25, grid = {} })
      screen:set_label("direction", "NORTH")
    `)

    expect(controller.setScreenLabel).toHaveBeenCalledWith(
      1, 'direction', 'NORTH', undefined, undefined
    )
  })

  it('set_label with create_label result passes colors correctly', async () => {
    await engine.doString(`
      local ansi = require("ansi")
      local screen = ansi.create_screen({ version = 1, width = 80, height = 25, grid = {} })
      local label = ansi.create_label("AB", ansi.colors.RED)
      screen:set_label("text1", label)
    `)

    const mock = controller.setScreenLabel as ReturnType<typeof vi.fn>
    expect(mock).toHaveBeenCalledTimes(1)
    const [id, identifier, text, textFg, textFgColors] = mock.mock.calls[0]
    expect(id).toBe(1)
    expect(identifier).toBe('text1')
    expect(text).toBe('AB')
    // RED = [170, 0, 0] is the default color
    expect(textFg).toEqual([170, 0, 0])
    // Both chars should have the default red color (no markup)
    expect(textFgColors).toEqual([[170, 0, 0], [170, 0, 0]])
  })

  it('set_label with color markup passes per-character colors', async () => {
    await engine.doString(`
      local ansi = require("ansi")
      local screen = ansi.create_screen({ version = 1, width = 80, height = 25, grid = {} })
      local label = ansi.create_label("[color=RED]A[/color]B")
      screen:set_label("text1", label)
    `)

    const mock = controller.setScreenLabel as ReturnType<typeof vi.fn>
    expect(mock).toHaveBeenCalledTimes(1)
    const [, , text, textFg, textFgColors] = mock.mock.calls[0]
    expect(text).toBe('AB')
    // Default color is LIGHT_GRAY
    expect(textFg).toEqual([170, 170, 170])
    // A = RED, B = default (LIGHT_GRAY)
    expect(textFgColors).toEqual([[170, 0, 0], [170, 170, 170]])
  })

  it('set_label throws when controller is not available', async () => {
    const engine2 = await new LuaFactory().createEngine()
    setupAnsiAPI(engine2, () => null)

    await expect(engine2.doString(`
      local ansi = require("ansi")
      local screen = ansi.create_screen({ version = 1, width = 80, height = 25, grid = {} })
      screen:set_label("text1", "test")
    `)).rejects.toThrow('ANSI terminal not available')

    engine2.global.close()
  })
})
