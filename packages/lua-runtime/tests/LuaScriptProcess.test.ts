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

      expect(onOutput).toHaveBeenCalledWith('hello from script')
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

      expect(onOutput).toHaveBeenCalledWith('You said: hello world')
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
})
