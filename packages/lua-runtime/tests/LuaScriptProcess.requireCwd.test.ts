import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LuaScriptProcess } from '../src/LuaScriptProcess'
import type { ShellContext, IFileSystem } from '@lua-learning/shell-core'

describe('LuaScriptProcess - require() CWD resolution', () => {
  let process: LuaScriptProcess
  let onOutput: ReturnType<typeof vi.fn>
  let onError: ReturnType<typeof vi.fn>
  let onExit: ReturnType<typeof vi.fn>
  let mockFileSystem: IFileSystem
  let context: ShellContext

  beforeEach(() => {
    onOutput = vi.fn()
    onError = vi.fn()
    onExit = vi.fn()

    mockFileSystem = {
      getCurrentDirectory: vi.fn().mockReturnValue('/home'),
      setCurrentDirectory: vi.fn(),
      exists: vi.fn().mockReturnValue(true),
      isDirectory: vi.fn().mockReturnValue(false),
      isFile: vi.fn().mockReturnValue(true),
      listDirectory: vi.fn().mockReturnValue([]),
      readFile: vi.fn().mockReturnValue('print("hello from script")'),
      writeFile: vi.fn(),
      createDirectory: vi.fn(),
      delete: vi.fn(),
    }

    context = {
      cwd: '/home',
      filesystem: mockFileSystem,
      output: vi.fn(),
      error: vi.fn(),
    }
  })

  it('should search CWD before script directory', async () => {
    // Setup: script in /projects/game/, CWD is /projects/
    // Both have utils.lua, but CWD version should be found first
    const readFileMock = mockFileSystem.readFile as ReturnType<typeof vi.fn>
    readFileMock.mockImplementation((path: string) => {
      if (path === '/projects/game/main.lua') {
        return `
          local utils = require("utils")
          print(utils.location)
        `
      }
      if (path === '/projects/utils.lua') {
        return 'return { location = "CWD" }' // Should find this one first
      }
      if (path === '/projects/game/utils.lua') {
        return 'return { location = "SCRIPT_DIR" }' // Should NOT find this
      }
      return null
    })
    const existsMock = mockFileSystem.exists as ReturnType<typeof vi.fn>
    existsMock.mockImplementation((path: string) => {
      return [
        '/projects/game/main.lua',
        '/projects/utils.lua',
        '/projects/game/utils.lua',
      ].includes(path)
    })

    // Set CWD to /projects/
    context = { ...context, cwd: '/projects' }

    process = new LuaScriptProcess('/projects/game/main.lua', context)
    process.onOutput = onOutput
    process.onError = onError
    process.onExit = onExit

    process.start()

    await new Promise((resolve) => setTimeout(resolve, 200))

    expect(onOutput).toHaveBeenCalledWith('CWD\n')
    expect(onExit).toHaveBeenCalledWith(0)
  })

  it('should NOT search script directory (standard Lua behavior)', async () => {
    // Setup: script in /projects/game/, CWD is /projects/
    // utils.lua only exists in script directory - should NOT be found
    // Standard Lua only searches CWD and package.path, not relative to script
    const readFileMock = mockFileSystem.readFile as ReturnType<typeof vi.fn>
    readFileMock.mockImplementation((path: string) => {
      if (path === '/projects/game/main.lua') {
        return `require("utils")` // Will fail - utils not in CWD or root
      }
      if (path === '/projects/game/utils.lua') {
        return 'return { location = "SCRIPT_DIR" }'
      }
      return null
    })
    const existsMock = mockFileSystem.exists as ReturnType<typeof vi.fn>
    existsMock.mockImplementation((path: string) => {
      return ['/projects/game/main.lua', '/projects/game/utils.lua'].includes(path)
    })

    context = { ...context, cwd: '/projects' }

    process = new LuaScriptProcess('/projects/game/main.lua', context)
    process.onOutput = onOutput
    process.onError = onError
    process.onExit = onExit

    process.start()

    await new Promise((resolve) => setTimeout(resolve, 200))

    // Should error because utils.lua is not in CWD (/projects/) or root (/)
    expect(onError).toHaveBeenCalled()
    expect(onExit).toHaveBeenCalledWith(1)
  })

  it('should search CWD first even for nested requires', async () => {
    // Setup:
    // - CWD: /projects/
    // - Script: /projects/main.lua
    // - moduleA: /projects/lib/a.lua (requires "helper")
    // - helper: /projects/helper.lua (in CWD)
    // - helper also exists elsewhere (but CWD should be found first)
    // With standard Lua behavior, require("lib.a") finds /projects/lib/a.lua (CWD + path)
    // Then a.lua's require("helper") finds /projects/helper.lua (CWD)
    const readFileMock = mockFileSystem.readFile as ReturnType<typeof vi.fn>
    readFileMock.mockImplementation((path: string) => {
      if (path === '/projects/main.lua') {
        return 'local a = require("lib.a"); print(a.value)'
      }
      if (path === '/projects/lib/a.lua') {
        return 'local h = require("helper"); return { value = h.source }'
      }
      if (path === '/projects/helper.lua') {
        return 'return { source = "CWD" }'
      }
      if (path === '/helper.lua') {
        return 'return { source = "ROOT" }'
      }
      return null
    })
    const existsMock = mockFileSystem.exists as ReturnType<typeof vi.fn>
    existsMock.mockImplementation((path: string) => {
      return [
        '/projects/main.lua',
        '/projects/lib/a.lua',
        '/projects/helper.lua',
        '/helper.lua',
      ].includes(path)
    })

    context = { ...context, cwd: '/projects' }

    process = new LuaScriptProcess('/projects/main.lua', context)
    process.onOutput = onOutput
    process.onError = onError
    process.onExit = onExit

    process.start()

    await new Promise((resolve) => setTimeout(resolve, 200))

    expect(onOutput).toHaveBeenCalledWith('CWD\n')
    expect(onExit).toHaveBeenCalledWith(0)
  })

  it('should NOT search module directory for nested requires (standard Lua behavior)', async () => {
    // Setup:
    // - CWD: /projects/
    // - Script: /projects/game/main.lua
    // - moduleA: /projects/game/lib/a.lua (requires "local_helper")
    // - local_helper only in /projects/game/lib/ (NOT in CWD or root)
    // Standard Lua: require("local_helper") from lib/a.lua should FAIL
    // User must use require("lib.local_helper") for full path
    const readFileMock = mockFileSystem.readFile as ReturnType<typeof vi.fn>
    readFileMock.mockImplementation((path: string) => {
      if (path === '/projects/game/main.lua') {
        return 'local a = require("lib.a"); print(a.value)'
      }
      if (path === '/projects/game/lib/a.lua') {
        return 'local h = require("local_helper"); return { value = h.source }'
      }
      if (path === '/projects/game/lib/local_helper.lua') {
        return 'return { source = "LOCAL" }'
      }
      return null
    })
    const existsMock = mockFileSystem.exists as ReturnType<typeof vi.fn>
    existsMock.mockImplementation((path: string) => {
      return [
        '/projects/game/main.lua',
        '/projects/game/lib/a.lua',
        '/projects/game/lib/local_helper.lua',
      ].includes(path)
    })

    context = { ...context, cwd: '/projects' }

    process = new LuaScriptProcess('/projects/game/main.lua', context)
    process.onOutput = onOutput
    process.onError = onError
    process.onExit = onExit

    process.start()

    await new Promise((resolve) => setTimeout(resolve, 200))

    // Should error - local_helper not in CWD (/projects/) or root (/)
    // User must use full path: require("lib.local_helper")
    expect(onError).toHaveBeenCalled()
    expect(onExit).toHaveBeenCalledWith(1)
  })

  it('should not duplicate search when CWD equals script directory', async () => {
    // Setup: CWD and script are in same directory
    const readFileMock = mockFileSystem.readFile as ReturnType<typeof vi.fn>
    readFileMock.mockImplementation((path: string) => {
      if (path === '/home/main.lua') {
        return 'local u = require("utils"); print(u.v)'
      }
      if (path === '/home/utils.lua') {
        return 'return { v = 42 }'
      }
      return null
    })
    const existsMock = mockFileSystem.exists as ReturnType<typeof vi.fn>
    existsMock.mockImplementation((path: string) => {
      return ['/home/main.lua', '/home/utils.lua'].includes(path)
    })

    // CWD equals script directory
    context = { ...context, cwd: '/home' }

    process = new LuaScriptProcess('/home/main.lua', context)
    process.onOutput = onOutput
    process.onError = onError
    process.onExit = onExit

    process.start()

    await new Promise((resolve) => setTimeout(resolve, 200))

    expect(onOutput).toHaveBeenCalledWith('42\n')
    expect(onExit).toHaveBeenCalledWith(0)
  })

  it('should find init.lua package in CWD', async () => {
    // Setup: CWD has mylib/init.lua
    const readFileMock = mockFileSystem.readFile as ReturnType<typeof vi.fn>
    readFileMock.mockImplementation((path: string) => {
      if (path === '/projects/game/main.lua') {
        return 'local lib = require("mylib"); print(lib.name)'
      }
      if (path === '/projects/mylib/init.lua') {
        return 'return { name = "CWD_INIT" }'
      }
      return null
    })
    const existsMock = mockFileSystem.exists as ReturnType<typeof vi.fn>
    existsMock.mockImplementation((path: string) => {
      return ['/projects/game/main.lua', '/projects/mylib/init.lua'].includes(path)
    })

    context = { ...context, cwd: '/projects' }

    process = new LuaScriptProcess('/projects/game/main.lua', context)
    process.onOutput = onOutput
    process.onError = onError
    process.onExit = onExit

    process.start()

    await new Promise((resolve) => setTimeout(resolve, 200))

    expect(onOutput).toHaveBeenCalledWith('CWD_INIT\n')
    expect(onExit).toHaveBeenCalledWith(0)
  })
})
