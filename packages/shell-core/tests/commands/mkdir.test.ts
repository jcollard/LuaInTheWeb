/**
 * Tests for mkdir command.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mkdir } from '../../src/commands/mkdir'
import type { IFileSystem } from '../../src/types'

describe('mkdir command', () => {
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
      expect(mkdir.name).toBe('mkdir')
    })

    it('should have a description', () => {
      expect(mkdir.description).toBeTruthy()
      expect(typeof mkdir.description).toBe('string')
    })

    it('should have usage information', () => {
      expect(mkdir.usage).toBeTruthy()
      expect(typeof mkdir.usage).toBe('string')
    })
  })

  describe('execute with valid path', () => {
    it('should create directory with absolute path', () => {
      const result = mkdir.execute(['/home/user/newdir'], mockFs)

      expect(result.exitCode).toBe(0)
      expect(mockFs.createDirectory).toHaveBeenCalledWith('/home/user/newdir')
    })

    it('should create directory with relative path', () => {
      const result = mkdir.execute(['newdir'], mockFs)

      expect(result.exitCode).toBe(0)
      expect(mockFs.createDirectory).toHaveBeenCalledWith('/home/user/newdir')
    })

    it('should return empty stdout on success', () => {
      const result = mkdir.execute(['newdir'], mockFs)

      expect(result.stdout).toBe('')
    })

    it('should return empty stderr on success', () => {
      const result = mkdir.execute(['newdir'], mockFs)

      expect(result.stderr).toBe('')
    })
  })

  describe('execute with no arguments', () => {
    it('should return error when no path provided', () => {
      const result = mkdir.execute([], mockFs)

      expect(result.exitCode).toBe(1)
      expect(result.stdout).toBe('')
      expect(result.stderr).toContain('missing operand')
    })

    it('should not create any directory', () => {
      mkdir.execute([], mockFs)

      expect(mockFs.createDirectory).not.toHaveBeenCalled()
    })
  })

  describe('execute when directory already exists', () => {
    it('should return error when path already exists', () => {
      mockFs.exists = vi.fn().mockReturnValue(true)
      mockFs.createDirectory = vi.fn().mockImplementation(() => {
        throw new Error('Path already exists: /home/user/existing')
      })

      const result = mkdir.execute(['existing'], mockFs)

      expect(result.exitCode).toBe(1)
      expect(result.stdout).toBe('')
      expect(result.stderr).toContain('cannot create directory')
    })
  })

  describe('execute when parent does not exist', () => {
    it('should return error when parent directory does not exist', () => {
      mockFs.createDirectory = vi.fn().mockImplementation(() => {
        throw new Error('Parent directory not found: /nonexistent')
      })

      const result = mkdir.execute(['/nonexistent/newdir'], mockFs)

      expect(result.exitCode).toBe(1)
      expect(result.stdout).toBe('')
      expect(result.stderr).toContain('cannot create directory')
    })
  })

  describe('execute with multiple directories', () => {
    it('should create all directories', () => {
      const result = mkdir.execute(['dir1', 'dir2', 'dir3'], mockFs)

      expect(result.exitCode).toBe(0)
      expect(mockFs.createDirectory).toHaveBeenCalledTimes(3)
      expect(mockFs.createDirectory).toHaveBeenCalledWith('/home/user/dir1')
      expect(mockFs.createDirectory).toHaveBeenCalledWith('/home/user/dir2')
      expect(mockFs.createDirectory).toHaveBeenCalledWith('/home/user/dir3')
    })

    it('should continue on error and report all errors', () => {
      let callCount = 0
      mockFs.createDirectory = vi.fn().mockImplementation((path: string) => {
        callCount++
        if (path === '/home/user/dir2') {
          throw new Error('Path already exists')
        }
      })

      const result = mkdir.execute(['dir1', 'dir2', 'dir3'], mockFs)

      // Should have attempted all three
      expect(mockFs.createDirectory).toHaveBeenCalledTimes(3)
      // Should report error
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('dir2')
    })

    it('should return success when all directories created', () => {
      const result = mkdir.execute(['a', 'b'], mockFs)

      expect(result.exitCode).toBe(0)
      expect(result.stderr).toBe('')
    })
  })

  describe('edge cases', () => {
    it('should handle path with trailing slash', () => {
      const result = mkdir.execute(['newdir/'], mockFs)

      expect(result.exitCode).toBe(0)
      expect(mockFs.createDirectory).toHaveBeenCalled()
    })
  })
})
