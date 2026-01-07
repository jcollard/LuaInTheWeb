import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LuaCommand } from '../src/LuaCommand'
import { LuaReplProcess } from '../src/LuaReplProcess'
import { LuaScriptProcess } from '../src/LuaScriptProcess'
import type { ShellContext, IFileSystem } from '@lua-learning/shell-core'

describe('LuaCommand', () => {
  let command: LuaCommand
  let mockFileSystem: IFileSystem
  let context: ShellContext

  beforeEach(() => {
    command = new LuaCommand()

    mockFileSystem = {
      getCurrentDirectory: vi.fn().mockReturnValue('/home'),
      setCurrentDirectory: vi.fn(),
      exists: vi.fn().mockReturnValue(true),
      isDirectory: vi.fn().mockReturnValue(false),
      isFile: vi.fn().mockReturnValue(true),
      listDirectory: vi.fn().mockReturnValue([]),
      readFile: vi.fn().mockReturnValue('print("test")'),
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

  describe('--lint flag', () => {
    it('should output nothing for valid Lua file', () => {
      mockFileSystem.readFile = vi.fn().mockReturnValue('print("hello")')

      const result = command.execute(['--lint', 'test.lua'], context)

      // --lint returns undefined (no process), just outputs directly
      expect(result).toBeUndefined()
      expect(context.error).not.toHaveBeenCalled()
    })

    it('should output error for invalid Lua file', () => {
      mockFileSystem.readFile = vi.fn().mockReturnValue('print("unclosed')

      command.execute(['--lint', 'test.lua'], context)

      expect(context.error).toHaveBeenCalled()
      const errorMessage = (context.error as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(errorMessage).toContain('test.lua')
    })

    it('should include line number in error output', () => {
      mockFileSystem.readFile = vi.fn().mockReturnValue('x = 1\nprint("unclosed')

      command.execute(['--lint', 'test.lua'], context)

      expect(context.error).toHaveBeenCalled()
      const errorMessage = (context.error as ReturnType<typeof vi.fn>).mock.calls[0][0]
      // Should mention line 2 where the error is
      expect(errorMessage).toMatch(/:\d+/)
    })

    it('should error if no filename provided', () => {
      command.execute(['--lint'], context)

      expect(context.error).toHaveBeenCalledWith(
        expect.stringContaining('filename')
      )
    })

    it('should error if file does not exist', () => {
      mockFileSystem.exists = vi.fn().mockReturnValue(false)

      command.execute(['--lint', 'missing.lua'], context)

      expect(context.error).toHaveBeenCalledWith(
        expect.stringContaining('not found')
      )
    })

    it('should resolve relative paths from cwd', () => {
      mockFileSystem.getCurrentDirectory = vi.fn().mockReturnValue('/project')
      mockFileSystem.readFile = vi.fn().mockReturnValue('x = 1')

      command.execute(['--lint', 'src/test.lua'], context)

      expect(mockFileSystem.exists).toHaveBeenCalledWith('/project/src/test.lua')
    })

    it('should handle absolute paths', () => {
      mockFileSystem.readFile = vi.fn().mockReturnValue('x = 1')

      command.execute(['--lint', '/absolute/path/test.lua'], context)

      expect(mockFileSystem.exists).toHaveBeenCalledWith('/absolute/path/test.lua')
    })

    it('should not leak WASM-related error messages', () => {
      // Various malformed code that might cause WASM issues
      const badCodes = [
        'print("unclosed',
        'if if if',
        '))))',
      ]

      for (const code of badCodes) {
        mockFileSystem.readFile = vi.fn().mockReturnValue(code)
        ;(context.error as ReturnType<typeof vi.fn>).mockClear()

        command.execute(['--lint', 'test.lua'], context)

        if ((context.error as ReturnType<typeof vi.fn>).mock.calls.length > 0) {
          const errorMessage = (context.error as ReturnType<typeof vi.fn>).mock.calls[0][0]
          expect(errorMessage.toLowerCase()).not.toContain('wasm')
          expect(errorMessage.toLowerCase()).not.toContain('memory access')
        }
      }
    })
  })

  describe('metadata', () => {
    it('should have name "lua"', () => {
      expect(command.name).toBe('lua')
    })

    it('should have a description', () => {
      expect(command.description).toBeDefined()
      expect(command.description.length).toBeGreaterThan(0)
    })

    it('should have usage information', () => {
      expect(command.usage).toBeDefined()
      expect(command.usage).toContain('lua')
    })
  })

  describe('execute', () => {
    it('should return LuaReplProcess when no args provided', () => {
      const result = command.execute([], context)

      expect(result).toBeInstanceOf(LuaReplProcess)
    })

    it('should return LuaScriptProcess when filename is provided', () => {
      const result = command.execute(['script.lua'], context)

      expect(result).toBeInstanceOf(LuaScriptProcess)
    })

    it('should pass filename to LuaScriptProcess', () => {
      const result = command.execute(['myfile.lua'], context) as LuaScriptProcess

      // Start the process to verify it uses the correct filename
      result.onOutput = vi.fn()
      result.onError = vi.fn()
      result.onExit = vi.fn()
      result.start()

      // Verify the filesystem was accessed with the correct path
      expect(mockFileSystem.exists).toHaveBeenCalled()
    })

    it('should pass context to LuaScriptProcess', () => {
      const result = command.execute(['test.lua'], context) as LuaScriptProcess

      result.onOutput = vi.fn()
      result.onError = vi.fn()
      result.onExit = vi.fn()
      result.start()

      // Context should be used to access filesystem
      expect(mockFileSystem.exists).toHaveBeenCalled()
    })
  })

  describe('--canvas flag', () => {
    it('should return LuaScriptProcess with default tab mode when --canvas is not specified', () => {
      const result = command.execute(['game.lua'], context)

      expect(result).toBeInstanceOf(LuaScriptProcess)
    })

    it('should return LuaScriptProcess when --canvas=tab is specified', () => {
      const result = command.execute(['--canvas=tab', 'game.lua'], context)

      expect(result).toBeInstanceOf(LuaScriptProcess)
    })

    it('should return LuaScriptProcess when --canvas=window is specified', () => {
      const result = command.execute(['--canvas=window', 'game.lua'], context)

      expect(result).toBeInstanceOf(LuaScriptProcess)
    })

    it('should parse --canvas flag before filename', () => {
      const result = command.execute(['--canvas=window', 'game.lua'], context) as LuaScriptProcess

      result.onOutput = vi.fn()
      result.onError = vi.fn()
      result.onExit = vi.fn()
      result.start()

      // Should check for game.lua, not --canvas=window
      expect(mockFileSystem.exists).toHaveBeenCalledWith('/home/game.lua')
    })

    it('should parse --canvas flag after filename', () => {
      const result = command.execute(['game.lua', '--canvas=window'], context) as LuaScriptProcess

      result.onOutput = vi.fn()
      result.onError = vi.fn()
      result.onExit = vi.fn()
      result.start()

      // Should check for game.lua
      expect(mockFileSystem.exists).toHaveBeenCalledWith('/home/game.lua')
    })

    it('should ignore invalid --canvas values and use default tab mode', () => {
      const result = command.execute(['--canvas=invalid', 'game.lua'], context)

      // Should still return a process (invalid values are silently ignored)
      expect(result).toBeInstanceOf(LuaScriptProcess)
    })

    it('should combine --lint and --canvas flags', () => {
      mockFileSystem.readFile = vi.fn().mockReturnValue('print("hello")')

      const result = command.execute(['--lint', '--canvas=window', 'test.lua'], context)

      // --lint takes precedence and returns undefined
      expect(result).toBeUndefined()
      expect(context.error).not.toHaveBeenCalled()
    })

    it('should return REPL when only --canvas=window is specified without filename', () => {
      const result = command.execute(['--canvas=window'], context)

      // REPL is returned when no filename, canvas mode is ignored for REPL
      expect(result).toBeInstanceOf(LuaReplProcess)
    })
  })

  describe('--screen flag', () => {
    it('should return LuaScriptProcess when --screen=1x is specified', () => {
      const result = command.execute(['--screen=1x', 'game.lua'], context)

      expect(result).toBeInstanceOf(LuaScriptProcess)
    })

    it('should return LuaScriptProcess when --screen=fit is specified', () => {
      const result = command.execute(['--screen=fit', 'game.lua'], context)

      expect(result).toBeInstanceOf(LuaScriptProcess)
    })

    it('should return LuaScriptProcess when --screen=full is specified', () => {
      const result = command.execute(['--screen=full', 'game.lua'], context)

      expect(result).toBeInstanceOf(LuaScriptProcess)
    })

    it('should parse --screen flag before filename', () => {
      const result = command.execute(
        ['--screen=fit', 'game.lua'],
        context
      ) as LuaScriptProcess

      result.onOutput = vi.fn()
      result.onError = vi.fn()
      result.onExit = vi.fn()
      result.start()

      // Should check for game.lua, not --screen=fit
      expect(mockFileSystem.exists).toHaveBeenCalledWith('/home/game.lua')
    })

    it('should parse --screen flag after filename', () => {
      const result = command.execute(
        ['game.lua', '--screen=full'],
        context
      ) as LuaScriptProcess

      result.onOutput = vi.fn()
      result.onError = vi.fn()
      result.onExit = vi.fn()
      result.start()

      // Should check for game.lua
      expect(mockFileSystem.exists).toHaveBeenCalledWith('/home/game.lua')
    })

    it('should ignore invalid --screen values', () => {
      const result = command.execute(['--screen=invalid', 'game.lua'], context)

      // Should still return a process (invalid values are silently ignored)
      expect(result).toBeInstanceOf(LuaScriptProcess)
    })

    it('should combine --screen with --canvas=window flags', () => {
      const result = command.execute(
        ['--canvas=window', '--screen=fit', 'game.lua'],
        context
      )

      expect(result).toBeInstanceOf(LuaScriptProcess)
    })

    it('should combine --lint and --screen flags', () => {
      mockFileSystem.readFile = vi.fn().mockReturnValue('print("hello")')

      const result = command.execute(
        ['--lint', '--screen=full', 'test.lua'],
        context
      )

      // --lint takes precedence and returns undefined
      expect(result).toBeUndefined()
      expect(context.error).not.toHaveBeenCalled()
    })

    it('should return REPL when only --screen is specified without filename', () => {
      const result = command.execute(['--screen=1x'], context)

      // REPL is returned when no filename, screen mode is ignored for REPL
      expect(result).toBeInstanceOf(LuaReplProcess)
    })
  })
})
