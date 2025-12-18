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
})
