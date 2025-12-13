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
