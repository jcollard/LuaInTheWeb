/**
 * Integration test: reproduces the bug where a script with
 *   load_screen(...) -> set_screen(s) -> start()
 * and `project.lua` having `ansi.use_font_blocks = "auto"` causes the
 * panel to mount as the pixel renderer even though the screen file
 * declared `useFontBlocks = false`.
 *
 * The bug lives in LuaScriptProcess.initAnsiAPI's `wrappedOnRequest`,
 * which calls `originalOnPanelMode(useFontBlocksOverride)` *unconditionally*.
 * For an "auto" project that passes `null`, overwriting any value the
 * controller already pushed when `set_screen` fired before `start()`.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LuaScriptProcess } from '../src/LuaScriptProcess'
import type { AnsiCallbacks, AnsiTerminalHandle } from '../src/AnsiController'
import type { ShellContext, IFileSystem } from '@lua-learning/shell-core'

function makeScreenFileContent(useFontBlocks: boolean): string {
  // Minimal v1 ANSI screen file. The grid array uses 1-based row/col so
  // the parser can pick it up.
  return `return {
    version = 1,
    width = 80,
    height = 25,
    useFontBlocks = ${useFontBlocks ? 'true' : 'false'},
    grid = {},
  }`
}

function makeProjectLua(useFontBlocks: 'on' | 'off' | 'auto'): string {
  return `return {
    name = "test",
    main = "main.lua",
    type = "ansi",
    ansi = { use_font_blocks = "${useFontBlocks}" },
  }`
}

function makeFakeFs(files: Record<string, string>): IFileSystem {
  return {
    getCurrentDirectory: vi.fn().mockReturnValue('/proj'),
    setCurrentDirectory: vi.fn(),
    exists: vi.fn().mockImplementation((p: string) => Object.hasOwn(files, p)),
    isDirectory: vi.fn().mockReturnValue(false),
    isFile: vi.fn().mockImplementation((p: string) => Object.hasOwn(files, p)),
    listDirectory: vi.fn().mockReturnValue([]),
    readFile: vi.fn().mockImplementation((p: string) => {
      if (!Object.hasOwn(files, p)) throw new Error('not found: ' + p)
      return files[p]
    }),
    writeFile: vi.fn(),
    createDirectory: vi.fn(),
    delete: vi.fn(),
  }
}

function makeMockHandle(): AnsiTerminalHandle {
  return {
    write: vi.fn(),
    container: { addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as HTMLElement,
    dispose: vi.fn(),
    resize: vi.fn(),
    setCrt: vi.fn(),
    setFontFamily: vi.fn(),
    setUseFontBlocks: vi.fn(),
  }
}

describe('LuaScriptProcess ANSI panel-mode integration', () => {
  let onAnsiPanelMode: ReturnType<typeof vi.fn>
  let ansiCallbacks: AnsiCallbacks
  let context: ShellContext

  beforeEach(() => {
    onAnsiPanelMode = vi.fn()
  })

  it('does not overwrite the controller-driven panel mode when project.lua = "auto"', async () => {
    // The user's setup: project = "auto", screen file says false.
    // The expectation: after the script's set_screen + start sequence,
    // onAnsiPanelMode should land on `false`, NOT be reset to `null`.
    const main = `
      local ansi = require("ansi")
      local s = ansi.load_screen("/proj/foo.ansi.lua")
      ansi.set_screen(s)
      ansi.start()
    `
    const files: Record<string, string> = {
      '/proj/main.lua': main,
      '/proj/project.lua': makeProjectLua('auto'),
      '/proj/foo.ansi.lua': makeScreenFileContent(false),
    }
    const fs = makeFakeFs(files)

    const handle = makeMockHandle()
    ansiCallbacks = {
      onRequestAnsiTab: vi.fn().mockResolvedValue(handle),
      onCloseAnsiTab: vi.fn(),
      onAnsiPanelMode,
    }
    context = {
      cwd: '/proj',
      filesystem: fs,
      output: vi.fn(),
      error: vi.fn(),
    }

    const proc = new LuaScriptProcess('main.lua', context, { ansiCallbacks })
    proc.onOutput = vi.fn()
    proc.onError = vi.fn()
    proc.onExit = vi.fn()
    proc.start()

    // Let wasmoon initialize, run the script, dispatch through the bridge.
    await new Promise((r) => setTimeout(r, 400))

    // Filter to the calls the UI would have applied. The LAST call wins as
    // the panel-mount state, so the final value here is what the user sees.
    const lastCall = onAnsiPanelMode.mock.calls[onAnsiPanelMode.mock.calls.length - 1]
    expect(lastCall, 'onAnsiPanelMode should have been called').toBeDefined()
    expect(lastCall?.[0], 'final panel mode should reflect the screen file (false), not be reset to null by wrappedOnRequest').toBe(false)

    proc.stop()
  }, 10000)
})
