/**
 * Tests for ansi.load_screen() - file-based screen loading.
 * Tests the __ansi_readFile bridge function and the Lua load_screen wrapper.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LuaFactory, LuaEngine } from 'wasmoon'
import { setupAnsiAPI } from '../src/setupAnsiAPI'
import type { AnsiController } from '../src/AnsiController'
import type { RGBColor } from '../src/screenTypes'
import { ANSI_ROWS, ANSI_COLS, DEFAULT_FG, DEFAULT_BG } from '../src/screenTypes'

/**
 * Build a minimal V1 .ansi.lua file content string.
 */
function makeV1FileContent(): string {
  const rows: string[] = []
  for (let r = 1; r <= ANSI_ROWS; r++) {
    const cells: string[] = []
    for (let c = 1; c <= ANSI_COLS; c++) {
      cells.push(`[${c}] = { char = " ", fg = {${DEFAULT_FG.join(',')}}, bg = {${DEFAULT_BG.join(',')}} }`)
    }
    rows.push(`[${r}] = { ${cells.join(', ')} }`)
  }
  return `return { version = 1, width = ${ANSI_COLS}, height = ${ANSI_ROWS}, grid = { ${rows.join(', ')} } }`
}

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
  } as unknown as AnsiController
}

describe('ansi.load_screen()', () => {
  let engine: LuaEngine
  let controller: AnsiController

  beforeEach(async () => {
    const factory = new LuaFactory()
    engine = await factory.createEngine()
    controller = createMockController()
  })

  afterEach(() => {
    engine.global.close()
  })

  it('loads a valid .ansi.lua file and returns a screen object', async () => {
    const fileContent = makeV1FileContent()
    const fileReader = vi.fn().mockImplementation((path: string) => {
      if (path === '/art/test.ansi.lua') return fileContent
      return null
    })

    setupAnsiAPI(engine, () => controller, { fileReader, cwd: '/' })

    await engine.doString(`
      local ansi = require("ansi")
      _test_screen = ansi.load_screen("art/test.ansi.lua")
    `)

    const screen = engine.global.get('_test_screen')
    expect(screen).toBeDefined()
    expect(screen.id).toBe(1)
    expect(controller.createScreen).toHaveBeenCalledTimes(1)
  })

  it('resolves relative paths from CWD', async () => {
    const fileContent = makeV1FileContent()
    const fileReader = vi.fn().mockImplementation((path: string) => {
      if (path === '/projects/my_game/art.ansi.lua') return fileContent
      return null
    })

    setupAnsiAPI(engine, () => controller, { fileReader, cwd: '/projects/my_game' })

    await engine.doString(`
      local ansi = require("ansi")
      _test_screen = ansi.load_screen("art.ansi.lua")
    `)

    expect(fileReader).toHaveBeenCalledWith('/projects/my_game/art.ansi.lua')
    expect(controller.createScreen).toHaveBeenCalledTimes(1)
  })

  it('falls back to root when file not found in CWD', async () => {
    const fileContent = makeV1FileContent()
    const fileReader = vi.fn().mockImplementation((path: string) => {
      if (path === '/shared.ansi.lua') return fileContent
      return null
    })

    setupAnsiAPI(engine, () => controller, { fileReader, cwd: '/projects/my_game' })

    await engine.doString(`
      local ansi = require("ansi")
      _test_screen = ansi.load_screen("shared.ansi.lua")
    `)

    // Should have tried CWD first, then root
    expect(fileReader).toHaveBeenCalledWith('/projects/my_game/shared.ansi.lua')
    expect(fileReader).toHaveBeenCalledWith('/shared.ansi.lua')
    expect(controller.createScreen).toHaveBeenCalledTimes(1)
  })

  it('handles absolute paths directly', async () => {
    const fileContent = makeV1FileContent()
    const fileReader = vi.fn().mockImplementation((path: string) => {
      if (path === '/absolute/path/art.ansi.lua') return fileContent
      return null
    })

    setupAnsiAPI(engine, () => controller, { fileReader, cwd: '/other' })

    await engine.doString(`
      local ansi = require("ansi")
      _test_screen = ansi.load_screen("/absolute/path/art.ansi.lua")
    `)

    expect(fileReader).toHaveBeenCalledWith('/absolute/path/art.ansi.lua')
    expect(controller.createScreen).toHaveBeenCalledTimes(1)
  })

  it('errors when file does not exist', async () => {
    const fileReader = vi.fn().mockReturnValue(null)

    setupAnsiAPI(engine, () => controller, { fileReader, cwd: '/' })

    await expect(engine.doString(`
      local ansi = require("ansi")
      ansi.load_screen("nonexistent.ansi.lua")
    `)).rejects.toThrow('ANSI file not found')
  })

  it('errors when file content is not valid Lua', async () => {
    const fileReader = vi.fn().mockReturnValue('this is not valid lua {{{{')

    setupAnsiAPI(engine, () => controller, { fileReader, cwd: '/' })

    await expect(engine.doString(`
      local ansi = require("ansi")
      ansi.load_screen("bad.ansi.lua")
    `)).rejects.toThrow('Failed to parse ANSI file')
  })

  it('errors when file does not return a table', async () => {
    const fileReader = vi.fn().mockReturnValue('return 42')

    setupAnsiAPI(engine, () => controller, { fileReader, cwd: '/' })

    await expect(engine.doString(`
      local ansi = require("ansi")
      ansi.load_screen("number.ansi.lua")
    `)).rejects.toThrow("did not return a table")
  })

  it('errors when path argument is not a string', async () => {
    const fileReader = vi.fn().mockReturnValue(null)

    setupAnsiAPI(engine, () => controller, { fileReader, cwd: '/' })

    await expect(engine.doString(`
      local ansi = require("ansi")
      ansi.load_screen(123)
    `)).rejects.toThrow('expects a string path')
  })

  it('errors when fileReader is not provided', async () => {
    setupAnsiAPI(engine, () => controller)

    await expect(engine.doString(`
      local ansi = require("ansi")
      ansi.load_screen("test.ansi.lua")
    `)).rejects.toThrow('not available in this context')
  })

  it('returns a screen object with layer control methods', async () => {
    const fileContent = makeV1FileContent()
    const fileReader = vi.fn().mockReturnValue(fileContent)

    setupAnsiAPI(engine, () => controller, { fileReader, cwd: '/' })

    await engine.doString(`
      local ansi = require("ansi")
      local screen = ansi.load_screen("test.ansi.lua")
      _has_get_layers = type(screen.get_layers) == "function"
      _has_layer_on = type(screen.layer_on) == "function"
      _has_layer_off = type(screen.layer_off) == "function"
      _has_layer_toggle = type(screen.layer_toggle) == "function"
      _has_play = type(screen.play) == "function"
      _has_pause = type(screen.pause) == "function"
      _has_is_playing = type(screen.is_playing) == "function"
    `)

    expect(engine.global.get('_has_get_layers')).toBe(true)
    expect(engine.global.get('_has_layer_on')).toBe(true)
    expect(engine.global.get('_has_layer_off')).toBe(true)
    expect(engine.global.get('_has_layer_toggle')).toBe(true)
    expect(engine.global.get('_has_play')).toBe(true)
    expect(engine.global.get('_has_pause')).toBe(true)
    expect(engine.global.get('_has_is_playing')).toBe(true)
  })
})
