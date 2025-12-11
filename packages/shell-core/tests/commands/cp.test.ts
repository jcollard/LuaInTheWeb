/**
 * Tests for cp command.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { cp } from '../../src/commands/cp'
import type { IFileSystem, FileEntry } from '../../src/types'

describe('cp command', () => {
  let mockFs: IFileSystem

  beforeEach(() => {
    mockFs = {
      getCurrentDirectory: vi.fn().mockReturnValue('/home/user'),
      setCurrentDirectory: vi.fn(),
      exists: vi.fn().mockReturnValue(true),
      isDirectory: vi.fn().mockReturnValue(false),
      isFile: vi.fn().mockReturnValue(true),
      listDirectory: vi.fn().mockReturnValue([]),
      readFile: vi.fn().mockReturnValue('file content'),
      writeFile: vi.fn(),
      createDirectory: vi.fn(),
      delete: vi.fn(),
    }
  })

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(cp.name).toBe('cp')
    })

    it('should have a description', () => {
      expect(cp.description).toBeTruthy()
      expect(typeof cp.description).toBe('string')
    })

    it('should have usage information', () => {
      expect(cp.usage).toBeTruthy()
      expect(typeof cp.usage).toBe('string')
    })
  })

  describe('execute copying file', () => {
    it('should copy file with absolute paths', () => {
      const result = cp.execute(['/home/user/source.txt', '/home/user/dest.txt'], mockFs)

      expect(result.exitCode).toBe(0)
      expect(mockFs.readFile).toHaveBeenCalledWith('/home/user/source.txt')
      expect(mockFs.writeFile).toHaveBeenCalledWith('/home/user/dest.txt', 'file content')
    })

    it('should copy file with relative paths', () => {
      const result = cp.execute(['source.txt', 'dest.txt'], mockFs)

      expect(result.exitCode).toBe(0)
      expect(mockFs.readFile).toHaveBeenCalledWith('/home/user/source.txt')
      expect(mockFs.writeFile).toHaveBeenCalledWith('/home/user/dest.txt', 'file content')
    })

    it('should return empty stdout on success', () => {
      const result = cp.execute(['source.txt', 'dest.txt'], mockFs)

      expect(result.stdout).toBe('')
    })

    it('should return empty stderr on success', () => {
      const result = cp.execute(['source.txt', 'dest.txt'], mockFs)

      expect(result.stderr).toBe('')
    })
  })

  describe('execute copying file to directory', () => {
    it('should copy file into destination directory with same name', () => {
      // source.txt is a file, destdir is a directory
      mockFs.isDirectory = vi.fn().mockImplementation((path: string) => {
        return path === '/home/user/destdir'
      })
      mockFs.isFile = vi.fn().mockImplementation((path: string) => {
        return path === '/home/user/source.txt'
      })

      const result = cp.execute(['source.txt', 'destdir'], mockFs)

      expect(result.exitCode).toBe(0)
      expect(mockFs.writeFile).toHaveBeenCalledWith('/home/user/destdir/source.txt', 'file content')
    })
  })

  describe('execute with missing arguments', () => {
    it('should return error when no arguments provided', () => {
      const result = cp.execute([], mockFs)

      expect(result.exitCode).toBe(1)
      expect(result.stdout).toBe('')
      expect(result.stderr).toContain('missing file operand')
    })

    it('should return error when only source provided', () => {
      const result = cp.execute(['source.txt'], mockFs)

      expect(result.exitCode).toBe(1)
      expect(result.stdout).toBe('')
      expect(result.stderr).toContain('missing destination')
    })

    it('should not read or write any files', () => {
      cp.execute([], mockFs)

      expect(mockFs.readFile).not.toHaveBeenCalled()
      expect(mockFs.writeFile).not.toHaveBeenCalled()
    })
  })

  describe('execute when source does not exist', () => {
    it('should return error when source file does not exist', () => {
      mockFs.exists = vi.fn().mockImplementation((path: string) => {
        return path !== '/home/user/missing.txt'
      })

      const result = cp.execute(['missing.txt', 'dest.txt'], mockFs)

      expect(result.exitCode).toBe(1)
      expect(result.stdout).toBe('')
      expect(result.stderr).toContain('cannot stat')
      expect(result.stderr).toContain('No such file or directory')
    })
  })

  describe('execute when source and destination are the same', () => {
    it('should return error when copying file to itself', () => {
      const result = cp.execute(['file.txt', 'file.txt'], mockFs)

      expect(result.exitCode).toBe(1)
      expect(result.stdout).toBe('')
      expect(result.stderr).toContain('are the same file')
    })

    it('should return error when paths resolve to same location', () => {
      const result = cp.execute(['./file.txt', 'file.txt'], mockFs)

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('are the same file')
    })

    it('should not read or write any files', () => {
      cp.execute(['file.txt', 'file.txt'], mockFs)

      expect(mockFs.readFile).not.toHaveBeenCalled()
      expect(mockFs.writeFile).not.toHaveBeenCalled()
    })
  })

  describe('execute copying directory recursively', () => {
    it('should copy directory and its contents', () => {
      // Set up directory structure
      mockFs.isDirectory = vi.fn().mockImplementation((path: string) => {
        return path === '/home/user/srcdir' || path === '/home/user/srcdir/subdir'
      })
      mockFs.isFile = vi.fn().mockImplementation((path: string) => {
        return path === '/home/user/srcdir/file1.txt' || path === '/home/user/srcdir/subdir/file2.txt'
      })
      mockFs.exists = vi.fn().mockImplementation((path: string) => {
        return (
          path === '/home/user/srcdir' ||
          path === '/home/user/srcdir/file1.txt' ||
          path === '/home/user/srcdir/subdir' ||
          path === '/home/user/srcdir/subdir/file2.txt'
        )
      })
      mockFs.listDirectory = vi.fn().mockImplementation((path: string): FileEntry[] => {
        if (path === '/home/user/srcdir') {
          return [
            { name: 'file1.txt', type: 'file', path: '/home/user/srcdir/file1.txt' },
            { name: 'subdir', type: 'directory', path: '/home/user/srcdir/subdir' },
          ]
        }
        if (path === '/home/user/srcdir/subdir') {
          return [{ name: 'file2.txt', type: 'file', path: '/home/user/srcdir/subdir/file2.txt' }]
        }
        return []
      })
      mockFs.readFile = vi.fn().mockImplementation((path: string) => {
        if (path === '/home/user/srcdir/file1.txt') return 'content1'
        if (path === '/home/user/srcdir/subdir/file2.txt') return 'content2'
        return ''
      })

      const result = cp.execute(['srcdir', 'destdir'], mockFs)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('')
      expect(result.stderr).toBe('')
      // Should create destination directory
      expect(mockFs.createDirectory).toHaveBeenCalledWith('/home/user/destdir')
      // Should create subdirectory
      expect(mockFs.createDirectory).toHaveBeenCalledWith('/home/user/destdir/subdir')
      // Should copy files
      expect(mockFs.writeFile).toHaveBeenCalledWith('/home/user/destdir/file1.txt', 'content1')
      expect(mockFs.writeFile).toHaveBeenCalledWith('/home/user/destdir/subdir/file2.txt', 'content2')
    })

    it('should copy empty directory', () => {
      mockFs.isDirectory = vi.fn().mockReturnValue(true)
      mockFs.isFile = vi.fn().mockReturnValue(false)
      mockFs.listDirectory = vi.fn().mockReturnValue([])
      mockFs.exists = vi.fn().mockImplementation((path: string) => {
        return path === '/home/user/emptydir'
      })

      const result = cp.execute(['emptydir', 'newdir'], mockFs)

      expect(result.exitCode).toBe(0)
      expect(mockFs.createDirectory).toHaveBeenCalledWith('/home/user/newdir')
    })
  })

  describe('execute with multiple sources', () => {
    it('should copy multiple files to destination directory', () => {
      mockFs.isDirectory = vi.fn().mockImplementation((path: string) => {
        return path === '/home/user/destdir'
      })
      mockFs.exists = vi.fn().mockReturnValue(true)

      const result = cp.execute(['file1.txt', 'file2.txt', 'destdir'], mockFs)

      expect(result.exitCode).toBe(0)
      expect(mockFs.writeFile).toHaveBeenCalledWith('/home/user/destdir/file1.txt', 'file content')
      expect(mockFs.writeFile).toHaveBeenCalledWith('/home/user/destdir/file2.txt', 'file content')
    })

    it('should return error when destination is not a directory with multiple sources', () => {
      // destfile is a file, not a directory
      mockFs.isDirectory = vi.fn().mockReturnValue(false)
      mockFs.isFile = vi.fn().mockReturnValue(true)

      const result = cp.execute(['file1.txt', 'file2.txt', 'destfile'], mockFs)

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('not a directory')
    })

    it('should return error when destination directory does not exist with multiple sources', () => {
      mockFs.exists = vi.fn().mockImplementation((path: string) => {
        return path !== '/home/user/nonexistent'
      })

      const result = cp.execute(['file1.txt', 'file2.txt', 'nonexistent'], mockFs)

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('No such file or directory')
    })
  })

  describe('edge cases', () => {
    it('should handle read errors gracefully', () => {
      mockFs.readFile = vi.fn().mockImplementation(() => {
        throw new Error('Permission denied')
      })

      const result = cp.execute(['source.txt', 'dest.txt'], mockFs)

      expect(result.exitCode).toBe(1)
      expect(result.stdout).toBe('')
      expect(result.stderr).toContain('Permission denied')
    })

    it('should handle write errors gracefully', () => {
      mockFs.writeFile = vi.fn().mockImplementation(() => {
        throw new Error('Disk full')
      })

      const result = cp.execute(['source.txt', 'dest.txt'], mockFs)

      expect(result.exitCode).toBe(1)
      expect(result.stdout).toBe('')
      expect(result.stderr).toContain('Disk full')
    })
  })
})
