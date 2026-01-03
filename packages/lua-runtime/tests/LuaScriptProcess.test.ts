import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LuaScriptProcess } from '../src/LuaScriptProcess'
import type { ShellContext, IFileSystem } from '@lua-learning/shell-core'

describe('LuaScriptProcess', () => {
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

  describe('initial state', () => {
    it('should not be running initially', () => {
      process = new LuaScriptProcess('test.lua', context)
      process.onOutput = onOutput
      process.onError = onError
      process.onExit = onExit

      expect(process.isRunning()).toBe(false)
    })
  })

  describe('start', () => {
    it('should execute script and output result', async () => {
      process = new LuaScriptProcess('test.lua', context)
      process.onOutput = onOutput
      process.onError = onError
      process.onExit = onExit

      process.start()

      // Wait for script execution
      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(onOutput).toHaveBeenCalledWith('hello from script\n')
    })

    it('should exit with code 0 on success', async () => {
      process = new LuaScriptProcess('test.lua', context)
      process.onOutput = onOutput
      process.onError = onError
      process.onExit = onExit

      process.start()

      // Wait for script execution
      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(onExit).toHaveBeenCalledWith(0)
      expect(process.isRunning()).toBe(false)
    })

    it('should error when file not found with [error] prefix', async () => {
      ;(mockFileSystem.exists as ReturnType<typeof vi.fn>).mockReturnValue(false)

      process = new LuaScriptProcess('nonexistent.lua', context)
      process.onOutput = onOutput
      process.onError = onError
      process.onExit = onExit

      process.start()

      // Wait for execution
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(onError).toHaveBeenCalled()
      const errorCall = onError.mock.calls[0][0]
      expect(errorCall).toMatch(/^\[error\].*not found/)
      expect(onExit).toHaveBeenCalledWith(1)
    })

    it('should error when path is a directory with [error] prefix', async () => {
      ;(mockFileSystem.isDirectory as ReturnType<typeof vi.fn>).mockReturnValue(true)
      ;(mockFileSystem.isFile as ReturnType<typeof vi.fn>).mockReturnValue(false)

      process = new LuaScriptProcess('somedir', context)
      process.onOutput = onOutput
      process.onError = onError
      process.onExit = onExit

      process.start()

      // Wait for execution
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(onError).toHaveBeenCalled()
      const errorCall = onError.mock.calls[0][0]
      expect(errorCall).toMatch(/^\[error\].*not a file/)
      expect(onExit).toHaveBeenCalledWith(1)
    })

    it('should handle Lua runtime errors', async () => {
      ;(mockFileSystem.readFile as ReturnType<typeof vi.fn>).mockReturnValue('error("script error")')

      process = new LuaScriptProcess('error.lua', context)
      process.onOutput = onOutput
      process.onError = onError
      process.onExit = onExit

      process.start()

      // Wait for execution
      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(onError).toHaveBeenCalled()
      expect(onExit).toHaveBeenCalledWith(1)
    })

    it('should handle Lua syntax errors', async () => {
      ;(mockFileSystem.readFile as ReturnType<typeof vi.fn>).mockReturnValue('this is not valid lua!')

      process = new LuaScriptProcess('syntax.lua', context)
      process.onOutput = onOutput
      process.onError = onError
      process.onExit = onExit

      process.start()

      // Wait for execution
      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(onError).toHaveBeenCalled()
      expect(onExit).toHaveBeenCalledWith(1)
    })
  })

  describe('stop', () => {
    it('should stop the script and exit with code 0', async () => {
      // Use a script that completes quickly
      ;(mockFileSystem.readFile as ReturnType<typeof vi.fn>).mockReturnValue('print("test")')

      process = new LuaScriptProcess('test.lua', context)
      process.onOutput = onOutput
      process.onError = onError
      process.onExit = onExit

      process.start()
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Script may have completed by now, but stop should still work
      process.stop()

      expect(process.isRunning()).toBe(false)
    })

    it('should do nothing if not running', () => {
      process = new LuaScriptProcess('test.lua', context)
      process.onOutput = onOutput
      process.onError = onError
      process.onExit = onExit

      process.stop()

      expect(onExit).not.toHaveBeenCalled()
    })
  })

  describe('handleInput', () => {
    it('should route input to io.read() when script is waiting', async () => {
      ;(mockFileSystem.readFile as ReturnType<typeof vi.fn>).mockReturnValue(`
        local input = io.read()
        print("You said: " .. input)
      `)

      process = new LuaScriptProcess('input.lua', context)
      process.onOutput = onOutput
      process.onError = onError
      process.onExit = onExit

      process.start()

      // Wait for script to start and call io.read()
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Provide input
      process.handleInput('hello world')

      // Wait for script to complete
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(onOutput).toHaveBeenCalledWith('You said: hello world\n')
    })

    it('should do nothing if not running', () => {
      process = new LuaScriptProcess('test.lua', context)
      process.onOutput = onOutput
      process.onError = onError
      process.onExit = onExit

      process.handleInput('test')

      expect(onOutput).not.toHaveBeenCalled()
    })
  })

  describe('relative paths', () => {
    it('should resolve relative paths from cwd', async () => {
      context.cwd = '/home/user'
      ;(mockFileSystem.readFile as ReturnType<typeof vi.fn>).mockReturnValue('print("resolved")')

      process = new LuaScriptProcess('scripts/test.lua', context)
      process.onOutput = onOutput
      process.onError = onError
      process.onExit = onExit

      process.start()

      // Wait for execution
      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(mockFileSystem.readFile).toHaveBeenCalledWith('/home/user/scripts/test.lua')
    })

    it('should handle absolute paths directly', async () => {
      ;(mockFileSystem.readFile as ReturnType<typeof vi.fn>).mockReturnValue('print("absolute")')

      process = new LuaScriptProcess('/absolute/path/test.lua', context)
      process.onOutput = onOutput
      process.onError = onError
      process.onExit = onExit

      process.start()

      // Wait for execution
      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(mockFileSystem.readFile).toHaveBeenCalledWith('/absolute/path/test.lua')
    })
  })

  describe('require', () => {
    it('should find module in same directory as script', async () => {
      // Setup: main.lua requires utils, both in /home
      const readFileMock = mockFileSystem.readFile as ReturnType<typeof vi.fn>
      readFileMock.mockImplementation((path: string) => {
        if (path === '/home/main.lua') {
          return `
            local utils = require("utils")
            print(utils.greet("World"))
          `
        }
        if (path === '/home/utils.lua') {
          return `
            local M = {}
            function M.greet(name)
              return "Hello, " .. name
            end
            return M
          `
        }
        return null
      })
      const existsMock = mockFileSystem.exists as ReturnType<typeof vi.fn>
      existsMock.mockImplementation((path: string) => {
        return path === '/home/main.lua' || path === '/home/utils.lua'
      })

      process = new LuaScriptProcess('/home/main.lua', context)
      process.onOutput = onOutput
      process.onError = onError
      process.onExit = onExit

      process.start()

      // Wait for execution
      await new Promise((resolve) => setTimeout(resolve, 200))

      expect(onOutput).toHaveBeenCalledWith('Hello, World\n')
      expect(onExit).toHaveBeenCalledWith(0)
    })

    it('should find module in subdirectory when CWD is set', async () => {
      // Setup: main.lua in /project requires lib/utils from /project/lib/utils.lua
      // CWD is set to /project so require("lib/utils") finds /project/lib/utils.lua
      const readFileMock = mockFileSystem.readFile as ReturnType<typeof vi.fn>
      readFileMock.mockImplementation((path: string) => {
        if (path === '/project/main.lua') {
          return `
            local utils = require("lib/utils")
            print(utils.add(2, 3))
          `
        }
        if (path === '/project/lib/utils.lua') {
          return `
            local M = {}
            function M.add(a, b)
              return a + b
            end
            return M
          `
        }
        return null
      })
      const existsMock = mockFileSystem.exists as ReturnType<typeof vi.fn>
      existsMock.mockImplementation((path: string) => {
        return path === '/project/main.lua' || path === '/project/lib/utils.lua'
      })

      // Set CWD to /project so require can find lib/utils
      context = { ...context, cwd: '/project' }

      process = new LuaScriptProcess('/project/main.lua', context)
      process.onOutput = onOutput
      process.onError = onError
      process.onExit = onExit

      process.start()

      // Wait for execution
      await new Promise((resolve) => setTimeout(resolve, 200))

      expect(onOutput).toHaveBeenCalledWith('5\n')
      expect(onExit).toHaveBeenCalledWith(0)
    })

    it('should cache loaded modules', async () => {
      // Setup: script requires utils twice
      const readFileMock = mockFileSystem.readFile as ReturnType<typeof vi.fn>
      readFileMock.mockImplementation((path: string) => {
        if (path === '/home/main.lua') {
          return `
            local utils1 = require("utils")
            local utils2 = require("utils")
            print(utils1 == utils2)
          `
        }
        if (path === '/home/utils.lua') {
          return 'return { value = 42 }'
        }
        return null
      })
      const existsMock = mockFileSystem.exists as ReturnType<typeof vi.fn>
      existsMock.mockImplementation((path: string) => {
        return path === '/home/main.lua' || path === '/home/utils.lua'
      })

      process = new LuaScriptProcess('/home/main.lua', context)
      process.onOutput = onOutput
      process.onError = onError
      process.onExit = onExit

      process.start()

      // Wait for execution
      await new Promise((resolve) => setTimeout(resolve, 200))

      // Modules are cached, so utils1 == utils2 should be true
      expect(onOutput).toHaveBeenCalledWith('true\n')
    })

    it('should show clear error when module not found', async () => {
      // Setup: script requires non-existent module
      const readFileMock = mockFileSystem.readFile as ReturnType<typeof vi.fn>
      readFileMock.mockImplementation((path: string) => {
        if (path === '/home/main.lua') {
          return 'require("nonexistent")'
        }
        return null
      })
      const existsMock = mockFileSystem.exists as ReturnType<typeof vi.fn>
      existsMock.mockImplementation((path: string) => {
        return path === '/home/main.lua'
      })

      process = new LuaScriptProcess('/home/main.lua', context)
      process.onOutput = onOutput
      process.onError = onError
      process.onExit = onExit

      process.start()

      // Wait for execution
      await new Promise((resolve) => setTimeout(resolve, 200))

      expect(onError).toHaveBeenCalled()
      const errorMsg = onError.mock.calls[0][0]
      expect(errorMsg).toContain('nonexistent')
      expect(errorMsg).toContain('not found')
      expect(onExit).toHaveBeenCalledWith(1)
    })

    it('should support nested requires (A requires B, B requires C)', async () => {
      // Setup: main requires moduleA, moduleA requires moduleB
      const readFileMock = mockFileSystem.readFile as ReturnType<typeof vi.fn>
      readFileMock.mockImplementation((path: string) => {
        if (path === '/home/main.lua') {
          return `
            local a = require("moduleA")
            print(a.getValue())
          `
        }
        if (path === '/home/moduleA.lua') {
          return `
            local b = require("moduleB")
            local M = {}
            function M.getValue()
              return b.base + 10
            end
            return M
          `
        }
        if (path === '/home/moduleB.lua') {
          return 'return { base = 5 }'
        }
        return null
      })
      const existsMock = mockFileSystem.exists as ReturnType<typeof vi.fn>
      existsMock.mockImplementation((path: string) => {
        return (
          path === '/home/main.lua' ||
          path === '/home/moduleA.lua' ||
          path === '/home/moduleB.lua'
        )
      })

      process = new LuaScriptProcess('/home/main.lua', context)
      process.onOutput = onOutput
      process.onError = onError
      process.onExit = onExit

      process.start()

      // Wait for execution
      await new Promise((resolve) => setTimeout(resolve, 200))

      expect(onOutput).toHaveBeenCalledWith('15\n')
      expect(onExit).toHaveBeenCalledWith(0)
    })

    it('should support dot notation for nested modules (utils.math)', async () => {
      // Setup: require("lib.utils") should find lib/utils.lua when CWD is set
      const readFileMock = mockFileSystem.readFile as ReturnType<typeof vi.fn>
      readFileMock.mockImplementation((path: string) => {
        if (path === '/project/main.lua') {
          return `
            local utils = require("lib.utils")
            print(utils.multiply(3, 4))
          `
        }
        if (path === '/project/lib/utils.lua') {
          return `
            local M = {}
            function M.multiply(a, b)
              return a * b
            end
            return M
          `
        }
        return null
      })
      const existsMock = mockFileSystem.exists as ReturnType<typeof vi.fn>
      existsMock.mockImplementation((path: string) => {
        return path === '/project/main.lua' || path === '/project/lib/utils.lua'
      })

      // Set CWD to /project so require can find lib.utils
      context = { ...context, cwd: '/project' }

      process = new LuaScriptProcess('/project/main.lua', context)
      process.onOutput = onOutput
      process.onError = onError
      process.onExit = onExit

      process.start()

      // Wait for execution
      await new Promise((resolve) => setTimeout(resolve, 200))

      expect(onOutput).toHaveBeenCalledWith('12\n')
      expect(onExit).toHaveBeenCalledWith(0)
    })

    // CWD-based require resolution tests are in LuaScriptProcess.requireCwd.test.ts
  })
})
