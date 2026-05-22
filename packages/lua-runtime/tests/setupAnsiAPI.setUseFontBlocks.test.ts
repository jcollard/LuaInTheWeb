/**
 * Tests for ansi.set_use_font_blocks() — Lua API → JS bridge → AnsiController.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LuaFactory, LuaEngine } from 'wasmoon'
import { setupAnsiAPI } from '../src/setupAnsiAPI'
import type { AnsiController } from '../src/AnsiController'

function createMockController(): AnsiController {
  return {
    isActive: vi.fn().mockReturnValue(false),
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    setRuntimeUseFontBlocksOverride: vi.fn(),
  } as unknown as AnsiController
}

describe('ansi.set_use_font_blocks bridge', () => {
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

  it('forwards true to setRuntimeUseFontBlocksOverride', async () => {
    await engine.doString(`
      local ansi = require("ansi")
      ansi.set_use_font_blocks(true)
    `)
    expect(controller.setRuntimeUseFontBlocksOverride).toHaveBeenCalledWith(true)
  })

  it('forwards false to setRuntimeUseFontBlocksOverride', async () => {
    await engine.doString(`
      local ansi = require("ansi")
      ansi.set_use_font_blocks(false)
    `)
    expect(controller.setRuntimeUseFontBlocksOverride).toHaveBeenCalledWith(false)
  })

  it('forwards nil as null override (clears override)', async () => {
    await engine.doString(`
      local ansi = require("ansi")
      ansi.set_use_font_blocks(nil)
    `)
    expect(controller.setRuntimeUseFontBlocksOverride).toHaveBeenCalledWith(null)
  })

  it('throws when given a non-boolean non-nil value', async () => {
    await expect(
      engine.doString(`
        local ansi = require("ansi")
        ansi.set_use_font_blocks("on")
      `)
    ).rejects.toThrow(/expects true, false, or nil/)
  })
})
