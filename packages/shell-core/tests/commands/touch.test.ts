/**
 * Tests for touch command.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { touch } from '../../src/commands/touch'
import type { IFileSystem } from '../../src/types'

describe('touch command', () => {
  let mockFs: IFileSystem

  beforeEach(() => {
    mockFs = {
      getCurrentDirectory: vi.fn().mockReturnValue('/home/user'),
      setCurrentDirectory: vi.fn(),
      exists: vi.fn().mockReturnValue(false),
      isDirectory: vi.fn().mockReturnValue(false),
      isFile: vi.fn().mockReturnValue(false),
      listDirectory: vi.fn().mockReturnValue([]),
      readFile: vi.fn(),
      writeFile: vi.fn(),
      createDirectory: vi.fn(),
      delete: vi.fn(),
    }
  })

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(touch.name).toBe('touch')
    })

    it('should have a description', () => {
      expect(touch.description).toBeTruthy()
      expect(typeof touch.description).toBe('string')
    })

    it('should have usage information', () => {
      expect(touch.usage).toBeTruthy()
      expect(typeof touch.usage).toBe('string')
    })
  })

  describe('execute creating new file', () => {
    it('should create file with absolute path', () => {
      const result = touch.execute(['/home/user/newfile.txt'], mockFs)

      expect(result.exitCode).toBe(0)
      expect(mockFs.writeFile).toHaveBeenCalledWith('/home/user/newfile.txt', '')
    })

    it('should create file with relative path', () => {
      const result = touch.execute(['newfile.txt'], mockFs)

      expect(result.exitCode).toBe(0)
      expect(mockFs.writeFile).toHaveBeenCalledWith('/home/user/newfile.txt', '')
    })

    it('should return empty stdout on success', () => {
      const result = touch.execute(['newfile.txt'], mockFs)

      expect(result.stdout).toBe('')
    })

    it('should return empty stderr on success', () => {
      const result = touch.execute(['newfile.txt'], mockFs)

      expect(result.stderr).toBe('')
    })
  })

  describe('execute with existing file', () => {
    it('should succeed without error when file exists', () => {
      mockFs.exists = vi.fn().mockReturnValue(true)
      mockFs.isFile = vi.fn().mockReturnValue(true)

      const result = touch.execute(['existing.txt'], mockFs)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('')
      expect(result.stderr).toBe('')
    })

    it('should not write to existing file (no-op)', () => {
      mockFs.exists = vi.fn().mockReturnValue(true)
      mockFs.isFile = vi.fn().mockReturnValue(true)

      touch.execute(['existing.txt'], mockFs)

      expect(mockFs.writeFile).not.toHaveBeenCalled()
    })

    it('should call both exists and isFile to check existing file', () => {
      mockFs.exists = vi.fn().mockReturnValue(true)
      mockFs.isFile = vi.fn().mockReturnValue(true)

      touch.execute(['existing.txt'], mockFs)

      expect(mockFs.exists).toHaveBeenCalled()
      expect(mockFs.isFile).toHaveBeenCalled()
    })
  })

  describe('execute with no arguments', () => {
    it('should return error when no path provided', () => {
      const result = touch.execute([], mockFs)

      expect(result.exitCode).toBe(1)
      expect(result.stdout).toBe('')
      expect(result.stderr).toContain('missing file operand')
    })

    it('should not write any file', () => {
      touch.execute([], mockFs)

      expect(mockFs.writeFile).not.toHaveBeenCalled()
    })
  })

  describe('execute when path is a directory', () => {
    it('should succeed when path is a directory (like bash)', () => {
      mockFs.exists = vi.fn().mockReturnValue(true)
      mockFs.isDirectory = vi.fn().mockReturnValue(true)

      const result = touch.execute(['somedir'], mockFs)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('')
      expect(result.stderr).toBe('')
    })

    it('should not write to directory', () => {
      mockFs.exists = vi.fn().mockReturnValue(true)
      mockFs.isDirectory = vi.fn().mockReturnValue(true)

      touch.execute(['somedir'], mockFs)

      expect(mockFs.writeFile).not.toHaveBeenCalled()
    })

    it('should handle mixed files and directories', () => {
      mockFs.exists = vi.fn().mockImplementation((path: string) => {
        return path === '/home/user/mydir'
      })
      mockFs.isDirectory = vi.fn().mockImplementation((path: string) => {
        return path === '/home/user/mydir'
      })

      const result = touch.execute(['file1.txt', 'mydir', 'file2.txt'], mockFs)

      expect(result.exitCode).toBe(0)
      expect(mockFs.writeFile).toHaveBeenCalledTimes(2)
      expect(mockFs.writeFile).toHaveBeenCalledWith('/home/user/file1.txt', '')
      expect(mockFs.writeFile).toHaveBeenCalledWith('/home/user/file2.txt', '')
    })
  })

  describe('execute when parent does not exist', () => {
    it('should return error when parent directory does not exist', () => {
      mockFs.writeFile = vi.fn().mockImplementation(() => {
        throw new Error('Parent directory not found')
      })

      const result = touch.execute(['/nonexistent/file.txt'], mockFs)

      expect(result.exitCode).toBe(1)
      expect(result.stdout).toBe('')
      expect(result.stderr).toContain('cannot touch')
    })
  })

  describe('multiple files', () => {
    it('should create all files when given multiple arguments', () => {
      const result = touch.execute(['file1.txt', 'file2.txt', 'file3.txt'], mockFs)

      expect(result.exitCode).toBe(0)
      expect(mockFs.writeFile).toHaveBeenCalledTimes(3)
      expect(mockFs.writeFile).toHaveBeenCalledWith('/home/user/file1.txt', '')
      expect(mockFs.writeFile).toHaveBeenCalledWith('/home/user/file2.txt', '')
      expect(mockFs.writeFile).toHaveBeenCalledWith('/home/user/file3.txt', '')
    })

    it('should handle mix of new and existing files', () => {
      mockFs.exists = vi.fn().mockImplementation((path: string) => {
        return path === '/home/user/existing.txt'
      })
      mockFs.isFile = vi.fn().mockImplementation((path: string) => {
        return path === '/home/user/existing.txt'
      })

      const result = touch.execute(['new1.txt', 'existing.txt', 'new2.txt'], mockFs)

      expect(result.exitCode).toBe(0)
      expect(mockFs.writeFile).toHaveBeenCalledTimes(2)
      expect(mockFs.writeFile).toHaveBeenCalledWith('/home/user/new1.txt', '')
      expect(mockFs.writeFile).toHaveBeenCalledWith('/home/user/new2.txt', '')
    })

    it('should continue and collect errors when some files fail', () => {
      mockFs.writeFile = vi.fn().mockImplementation((path: string) => {
        if (path === '/home/user/bad.txt') {
          throw new Error('Parent directory not found')
        }
      })

      const result = touch.execute(['good1.txt', 'bad.txt', 'good2.txt'], mockFs)

      expect(result.exitCode).toBe(1)
      expect(mockFs.writeFile).toHaveBeenCalledTimes(3)
      expect(result.stderr).toContain('cannot touch')
      expect(result.stderr).toContain('bad.txt')
    })
  })
})
