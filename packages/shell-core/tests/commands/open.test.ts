/**
 * Tests for open command.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { OpenCommand } from '../../src/commands/open'
import type { ShellContext } from '../../src/interfaces/ShellContext'
import type { IFileSystem } from '../../src/types'

describe('OpenCommand', () => {
  let command: OpenCommand
  let mockFs: IFileSystem
  let mockContext: ShellContext

  beforeEach(() => {
    command = new OpenCommand()

    mockFs = {
      getCurrentDirectory: vi.fn().mockReturnValue('/home/user'),
      setCurrentDirectory: vi.fn(),
      exists: vi.fn().mockReturnValue(true),
      isDirectory: vi.fn().mockReturnValue(false),
      isFile: vi.fn().mockReturnValue(true),
      listDirectory: vi.fn().mockReturnValue([]),
      readFile: vi.fn(),
      writeFile: vi.fn(),
      createDirectory: vi.fn(),
      delete: vi.fn(),
    }

    mockContext = {
      cwd: '/home/user',
      filesystem: mockFs,
      output: vi.fn(),
      error: vi.fn(),
    }
  })

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(command.name).toBe('open')
    })

    it('should have a description', () => {
      expect(command.description).toBeTruthy()
      expect(typeof command.description).toBe('string')
    })

    it('should have usage information', () => {
      expect(command.usage).toBeTruthy()
      expect(command.usage).toContain('open')
    })
  })

  describe('execute with valid file', () => {
    it('should call onRequestOpenFile with resolved absolute path', () => {
      const openFileFn = vi.fn()
      mockContext.onRequestOpenFile = openFileFn

      command.execute(['test.txt'], mockContext)

      expect(openFileFn).toHaveBeenCalledWith('/home/user/test.txt')
    })

    it('should call onRequestOpenFile with absolute path as-is', () => {
      const openFileFn = vi.fn()
      mockContext.onRequestOpenFile = openFileFn

      command.execute(['/absolute/path/file.lua'], mockContext)

      expect(openFileFn).toHaveBeenCalledWith('/absolute/path/file.lua')
    })

    it('should output success message after opening file', () => {
      mockContext.onRequestOpenFile = vi.fn()

      command.execute(['test.txt'], mockContext)

      expect(mockContext.output).toHaveBeenCalled()
    })

    it('should return void (not a long-running process)', () => {
      mockContext.onRequestOpenFile = vi.fn()

      const result = command.execute(['test.txt'], mockContext)

      expect(result).toBeUndefined()
    })
  })

  describe('execute when file does not exist', () => {
    it('should output error when file not found', () => {
      mockFs.exists = vi.fn().mockReturnValue(false)
      mockContext.onRequestOpenFile = vi.fn()

      command.execute(['nonexistent.txt'], mockContext)

      expect(mockContext.error).toHaveBeenCalled()
      const errorCall = vi.mocked(mockContext.error).mock.calls[0][0]
      expect(errorCall).toContain('nonexistent.txt')
    })

    it('should not call onRequestOpenFile when file not found', () => {
      mockFs.exists = vi.fn().mockReturnValue(false)
      const openFileFn = vi.fn()
      mockContext.onRequestOpenFile = openFileFn

      command.execute(['nonexistent.txt'], mockContext)

      expect(openFileFn).not.toHaveBeenCalled()
    })
  })

  describe('execute with no arguments', () => {
    it('should output usage error when no file provided', () => {
      mockContext.onRequestOpenFile = vi.fn()

      command.execute([], mockContext)

      expect(mockContext.error).toHaveBeenCalled()
      const errorCall = vi.mocked(mockContext.error).mock.calls[0][0]
      expect(errorCall).toContain('usage')
    })

    it('should not call onRequestOpenFile when no file provided', () => {
      const openFileFn = vi.fn()
      mockContext.onRequestOpenFile = openFileFn

      command.execute([], mockContext)

      expect(openFileFn).not.toHaveBeenCalled()
    })
  })

  describe('execute when no editor integration', () => {
    it('should output message when onRequestOpenFile is not defined', () => {
      // No onRequestOpenFile callback set

      command.execute(['test.txt'], mockContext)

      expect(mockContext.error).toHaveBeenCalled()
      const errorCall = vi.mocked(mockContext.error).mock.calls[0][0]
      expect(errorCall.toLowerCase()).toContain('editor')
    })

    it('should check file existence even without editor integration', () => {
      command.execute(['test.txt'], mockContext)

      expect(mockFs.exists).toHaveBeenCalled()
    })

    it('should show file not found error before editor not available', () => {
      mockFs.exists = vi.fn().mockReturnValue(false)

      command.execute(['nonexistent.txt'], mockContext)

      expect(mockContext.error).toHaveBeenCalled()
      const errorCall = vi.mocked(mockContext.error).mock.calls[0][0]
      expect(errorCall).toContain('nonexistent.txt')
    })
  })

  describe('execute with directory', () => {
    it('should show error when trying to open a directory', () => {
      mockFs.isDirectory = vi.fn().mockReturnValue(true)
      mockFs.isFile = vi.fn().mockReturnValue(false)
      const openFileFn = vi.fn()
      mockContext.onRequestOpenFile = openFileFn

      command.execute(['mydir'], mockContext)

      expect(mockContext.error).toHaveBeenCalled()
      const errorCall = vi.mocked(mockContext.error).mock.calls[0][0]
      expect(errorCall).toContain('Is a directory')
    })

    it('should not call onRequestOpenFile when path is a directory', () => {
      mockFs.isDirectory = vi.fn().mockReturnValue(true)
      mockFs.isFile = vi.fn().mockReturnValue(false)
      const openFileFn = vi.fn()
      mockContext.onRequestOpenFile = openFileFn

      command.execute(['mydir'], mockContext)

      expect(openFileFn).not.toHaveBeenCalled()
    })
  })

  describe('path resolution', () => {
    it('should resolve relative paths from cwd', () => {
      mockContext.cwd = '/projects/myapp'
      const openFileFn = vi.fn()
      mockContext.onRequestOpenFile = openFileFn

      command.execute(['src/main.lua'], mockContext)

      expect(openFileFn).toHaveBeenCalledWith('/projects/myapp/src/main.lua')
    })

    it('should handle parent directory references', () => {
      mockContext.cwd = '/projects/myapp/src'
      const openFileFn = vi.fn()
      mockContext.onRequestOpenFile = openFileFn

      command.execute(['../README.md'], mockContext)

      expect(openFileFn).toHaveBeenCalledWith('/projects/myapp/README.md')
    })

    it('should handle current directory references', () => {
      const openFileFn = vi.fn()
      mockContext.onRequestOpenFile = openFileFn

      command.execute(['./test.txt'], mockContext)

      expect(openFileFn).toHaveBeenCalledWith('/home/user/test.txt')
    })
  })
})
