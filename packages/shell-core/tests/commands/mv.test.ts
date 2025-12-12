/**
 * Tests for mv command.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mv } from '../../src/commands/mv'
import type { IFileSystem, FileEntry } from '../../src/types'

describe('mv command', () => {
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
      expect(mv.name).toBe('mv')
    })

    it('should have a description', () => {
      expect(mv.description).toBeTruthy()
      expect(typeof mv.description).toBe('string')
    })

    it('should have usage information', () => {
      expect(mv.usage).toBeTruthy()
      expect(typeof mv.usage).toBe('string')
    })
  })

  describe('execute moving file', () => {
    it('should move file with absolute paths', () => {
      const result = mv.execute(['/home/user/source.txt', '/home/user/dest.txt'], mockFs)

      expect(result.exitCode).toBe(0)
      expect(mockFs.readFile).toHaveBeenCalledWith('/home/user/source.txt')
      expect(mockFs.writeFile).toHaveBeenCalledWith('/home/user/dest.txt', 'file content')
      expect(mockFs.delete).toHaveBeenCalledWith('/home/user/source.txt')
    })

    it('should move file with relative paths', () => {
      const result = mv.execute(['source.txt', 'dest.txt'], mockFs)

      expect(result.exitCode).toBe(0)
      expect(mockFs.readFile).toHaveBeenCalledWith('/home/user/source.txt')
      expect(mockFs.writeFile).toHaveBeenCalledWith('/home/user/dest.txt', 'file content')
      expect(mockFs.delete).toHaveBeenCalledWith('/home/user/source.txt')
    })

    it('should return empty stdout on success', () => {
      const result = mv.execute(['source.txt', 'dest.txt'], mockFs)

      expect(result.stdout).toBe('')
    })

    it('should return empty stderr on success', () => {
      const result = mv.execute(['source.txt', 'dest.txt'], mockFs)

      expect(result.stderr).toBe('')
    })
  })

  describe('execute moving file to directory', () => {
    it('should move file into destination directory with same name', () => {
      mockFs.isDirectory = vi.fn().mockImplementation((path: string) => {
        return path === '/home/user/destdir'
      })
      mockFs.isFile = vi.fn().mockImplementation((path: string) => {
        return path === '/home/user/source.txt'
      })

      const result = mv.execute(['source.txt', 'destdir'], mockFs)

      expect(result.exitCode).toBe(0)
      expect(mockFs.writeFile).toHaveBeenCalledWith('/home/user/destdir/source.txt', 'file content')
      expect(mockFs.delete).toHaveBeenCalledWith('/home/user/source.txt')
    })
  })

  describe('execute with missing arguments', () => {
    it('should return error when no arguments provided', () => {
      const result = mv.execute([], mockFs)

      expect(result.exitCode).toBe(1)
      expect(result.stdout).toBe('')
      expect(result.stderr).toContain('missing file operand')
    })

    it('should return error when only source provided', () => {
      const result = mv.execute(['source.txt'], mockFs)

      expect(result.exitCode).toBe(1)
      expect(result.stdout).toBe('')
      expect(result.stderr).toContain('missing destination')
    })

    it('should not modify any files', () => {
      mv.execute([], mockFs)

      expect(mockFs.readFile).not.toHaveBeenCalled()
      expect(mockFs.writeFile).not.toHaveBeenCalled()
      expect(mockFs.delete).not.toHaveBeenCalled()
    })
  })

  describe('execute when source does not exist', () => {
    it('should return error when source file does not exist', () => {
      mockFs.exists = vi.fn().mockImplementation((path: string) => {
        return path !== '/home/user/missing.txt'
      })

      const result = mv.execute(['missing.txt', 'dest.txt'], mockFs)

      expect(result.exitCode).toBe(1)
      expect(result.stdout).toBe('')
      expect(result.stderr).toContain('cannot stat')
      expect(result.stderr).toContain('No such file or directory')
    })
  })

  describe('execute when source and destination are the same', () => {
    it('should return error when moving file to itself', () => {
      const result = mv.execute(['file.txt', 'file.txt'], mockFs)

      expect(result.exitCode).toBe(1)
      expect(result.stdout).toBe('')
      expect(result.stderr).toContain('are the same file')
    })

    it('should return error when paths resolve to same location', () => {
      const result = mv.execute(['./file.txt', 'file.txt'], mockFs)

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('are the same file')
    })

    it('should not read, write, or delete any files', () => {
      mv.execute(['file.txt', 'file.txt'], mockFs)

      expect(mockFs.readFile).not.toHaveBeenCalled()
      expect(mockFs.writeFile).not.toHaveBeenCalled()
      expect(mockFs.delete).not.toHaveBeenCalled()
    })
  })

  describe('execute moving directory recursively', () => {
    it('should move directory and its contents', () => {
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

      const result = mv.execute(['srcdir', 'destdir'], mockFs)

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
      // Should delete source files and directories (files first, then subdirs, then root)
      expect(mockFs.delete).toHaveBeenCalledWith('/home/user/srcdir/file1.txt')
      expect(mockFs.delete).toHaveBeenCalledWith('/home/user/srcdir/subdir/file2.txt')
      expect(mockFs.delete).toHaveBeenCalledWith('/home/user/srcdir/subdir')
      expect(mockFs.delete).toHaveBeenCalledWith('/home/user/srcdir')
    })

    it('should move empty directory', () => {
      mockFs.isDirectory = vi.fn().mockReturnValue(true)
      mockFs.isFile = vi.fn().mockReturnValue(false)
      mockFs.listDirectory = vi.fn().mockReturnValue([])
      mockFs.exists = vi.fn().mockImplementation((path: string) => {
        return path === '/home/user/emptydir'
      })

      const result = mv.execute(['emptydir', 'newdir'], mockFs)

      expect(result.exitCode).toBe(0)
      expect(mockFs.createDirectory).toHaveBeenCalledWith('/home/user/newdir')
      expect(mockFs.delete).toHaveBeenCalledWith('/home/user/emptydir')
    })
  })

  describe('execute with multiple sources', () => {
    it('should move multiple files to destination directory', () => {
      mockFs.isDirectory = vi.fn().mockImplementation((path: string) => {
        return path === '/home/user/destdir'
      })
      mockFs.exists = vi.fn().mockReturnValue(true)

      const result = mv.execute(['file1.txt', 'file2.txt', 'destdir'], mockFs)

      expect(result.exitCode).toBe(0)
      expect(mockFs.writeFile).toHaveBeenCalledWith('/home/user/destdir/file1.txt', 'file content')
      expect(mockFs.writeFile).toHaveBeenCalledWith('/home/user/destdir/file2.txt', 'file content')
      expect(mockFs.delete).toHaveBeenCalledWith('/home/user/file1.txt')
      expect(mockFs.delete).toHaveBeenCalledWith('/home/user/file2.txt')
    })

    it('should return error when destination is not a directory with multiple sources', () => {
      mockFs.isDirectory = vi.fn().mockReturnValue(false)
      mockFs.isFile = vi.fn().mockReturnValue(true)

      const result = mv.execute(['file1.txt', 'file2.txt', 'destfile'], mockFs)

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('not a directory')
    })

    it('should return error when destination directory does not exist with multiple sources', () => {
      mockFs.exists = vi.fn().mockImplementation((path: string) => {
        return path !== '/home/user/nonexistent'
      })

      const result = mv.execute(['file1.txt', 'file2.txt', 'nonexistent'], mockFs)

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('No such file or directory')
    })
  })

  describe('edge cases', () => {
    it('should handle read errors gracefully', () => {
      mockFs.readFile = vi.fn().mockImplementation(() => {
        throw new Error('Permission denied')
      })

      const result = mv.execute(['source.txt', 'dest.txt'], mockFs)

      expect(result.exitCode).toBe(1)
      expect(result.stdout).toBe('')
      expect(result.stderr).toContain('Permission denied')
    })

    it('should handle write errors gracefully', () => {
      mockFs.writeFile = vi.fn().mockImplementation(() => {
        throw new Error('Disk full')
      })

      const result = mv.execute(['source.txt', 'dest.txt'], mockFs)

      expect(result.exitCode).toBe(1)
      expect(result.stdout).toBe('')
      expect(result.stderr).toContain('Disk full')
    })

    it('should handle delete errors gracefully', () => {
      mockFs.delete = vi.fn().mockImplementation(() => {
        throw new Error('Permission denied')
      })

      const result = mv.execute(['source.txt', 'dest.txt'], mockFs)

      expect(result.exitCode).toBe(1)
      expect(result.stdout).toBe('')
      expect(result.stderr).toContain('Permission denied')
    })
  })
})
