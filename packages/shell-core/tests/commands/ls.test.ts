/**
 * Tests for ls command.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ls } from '../../src/commands/ls'
import type { IFileSystem, FileEntry } from '../../src/types'

describe('ls command', () => {
  let mockFs: IFileSystem

  beforeEach(() => {
    mockFs = {
      getCurrentDirectory: vi.fn().mockReturnValue('/home/user'),
      setCurrentDirectory: vi.fn(),
      exists: vi.fn().mockReturnValue(true),
      isDirectory: vi.fn().mockReturnValue(true),
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
      expect(ls.name).toBe('ls')
    })

    it('should have a description', () => {
      expect(ls.description).toBeTruthy()
      expect(typeof ls.description).toBe('string')
    })

    it('should have usage information', () => {
      expect(ls.usage).toBeTruthy()
      expect(typeof ls.usage).toBe('string')
    })
  })

  describe('execute with no arguments (current directory)', () => {
    it('should list current directory when no args provided', () => {
      const entries: FileEntry[] = [
        { name: 'file.txt', type: 'file', path: '/home/user/file.txt' },
        { name: 'docs', type: 'directory', path: '/home/user/docs' },
      ]
      mockFs.listDirectory = vi.fn().mockReturnValue(entries)

      const result = ls.execute([], mockFs)

      expect(result.exitCode).toBe(0)
      expect(mockFs.listDirectory).toHaveBeenCalledWith('/home/user')
    })

    it('should output file names, one per line', () => {
      const entries: FileEntry[] = [
        { name: 'file.txt', type: 'file', path: '/home/user/file.txt' },
        { name: 'docs', type: 'directory', path: '/home/user/docs' },
      ]
      mockFs.listDirectory = vi.fn().mockReturnValue(entries)

      const result = ls.execute([], mockFs)

      expect(result.stdout).toContain('file.txt')
      expect(result.stdout).toContain('docs')
    })

    it('should return empty string for empty directory', () => {
      mockFs.listDirectory = vi.fn().mockReturnValue([])

      const result = ls.execute([], mockFs)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('')
    })
  })

  describe('execute with path argument', () => {
    it('should list specified directory with absolute path', () => {
      const entries: FileEntry[] = [
        { name: 'log1.txt', type: 'file', path: '/var/log/log1.txt' },
      ]
      mockFs.listDirectory = vi.fn().mockReturnValue(entries)

      const result = ls.execute(['/var/log'], mockFs)

      expect(result.exitCode).toBe(0)
      expect(mockFs.listDirectory).toHaveBeenCalledWith('/var/log')
      expect(result.stdout).toContain('log1.txt')
    })

    it('should list specified directory with relative path', () => {
      const entries: FileEntry[] = [
        { name: 'readme.md', type: 'file', path: '/home/user/docs/readme.md' },
      ]
      mockFs.listDirectory = vi.fn().mockReturnValue(entries)

      const result = ls.execute(['docs'], mockFs)

      expect(result.exitCode).toBe(0)
      expect(mockFs.listDirectory).toHaveBeenCalledWith('/home/user/docs')
      expect(result.stdout).toContain('readme.md')
    })

    it('should show file info when path is a file', () => {
      mockFs.isDirectory = vi.fn().mockReturnValue(false)
      mockFs.isFile = vi.fn().mockReturnValue(true)

      const result = ls.execute(['/home/user/file.txt'], mockFs)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('file.txt')
    })
  })

  describe('execute with invalid path', () => {
    it('should return error when path does not exist', () => {
      mockFs.exists = vi.fn().mockReturnValue(false)

      const result = ls.execute(['/nonexistent'], mockFs)

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('no such file or directory')
      expect(result.stderr).toContain('/nonexistent')
      expect(result.stdout).toBe('')
    })
  })

  describe('output details', () => {
    it('should return empty stderr on success for file', () => {
      mockFs.isDirectory = vi.fn().mockReturnValue(false)
      mockFs.isFile = vi.fn().mockReturnValue(true)

      const result = ls.execute(['/home/user/file.txt'], mockFs)

      expect(result.stderr).toBe('')
    })

    it('should return empty stderr on success for directory listing', () => {
      const entries: FileEntry[] = [
        { name: 'file.txt', type: 'file', path: '/home/user/file.txt' },
      ]
      mockFs.listDirectory = vi.fn().mockReturnValue(entries)

      const result = ls.execute([], mockFs)

      expect(result.stderr).toBe('')
    })
  })

  describe('output formatting', () => {
    it('should sort entries alphabetically', () => {
      const entries: FileEntry[] = [
        { name: 'zebra.txt', type: 'file', path: '/home/user/zebra.txt' },
        { name: 'alpha.txt', type: 'file', path: '/home/user/alpha.txt' },
        { name: 'beta.txt', type: 'file', path: '/home/user/beta.txt' },
      ]
      mockFs.listDirectory = vi.fn().mockReturnValue(entries)

      const result = ls.execute([], mockFs)
      const lines = result.stdout.split('\n')

      expect(lines[0]).toBe('alpha.txt')
      expect(lines[1]).toBe('beta.txt')
      expect(lines[2]).toBe('zebra.txt')
    })

    it('should list directories before files when sorting', () => {
      const entries: FileEntry[] = [
        { name: 'file.txt', type: 'file', path: '/home/user/file.txt' },
        { name: 'docs', type: 'directory', path: '/home/user/docs' },
        { name: 'another.txt', type: 'file', path: '/home/user/another.txt' },
        { name: 'bin', type: 'directory', path: '/home/user/bin' },
      ]
      mockFs.listDirectory = vi.fn().mockReturnValue(entries)

      const result = ls.execute([], mockFs)
      const lines = result.stdout.split('\n')

      // Directories first (sorted), then files (sorted)
      expect(lines[0]).toBe('bin/')
      expect(lines[1]).toBe('docs/')
      expect(lines[2]).toBe('another.txt')
      expect(lines[3]).toBe('file.txt')
    })

    it('should append / to directory names', () => {
      const entries: FileEntry[] = [
        { name: 'mydir', type: 'directory', path: '/home/user/mydir' },
      ]
      mockFs.listDirectory = vi.fn().mockReturnValue(entries)

      const result = ls.execute([], mockFs)

      expect(result.stdout).toBe('mydir/')
    })
  })

  describe('edge cases', () => {
    it('should handle root directory', () => {
      mockFs.getCurrentDirectory = vi.fn().mockReturnValue('/')
      const entries: FileEntry[] = [
        { name: 'home', type: 'directory', path: '/home' },
        { name: 'var', type: 'directory', path: '/var' },
      ]
      mockFs.listDirectory = vi.fn().mockReturnValue(entries)

      const result = ls.execute([], mockFs)

      expect(result.exitCode).toBe(0)
      expect(mockFs.listDirectory).toHaveBeenCalledWith('/')
    })

    it('should ignore extra arguments', () => {
      const entries: FileEntry[] = []
      mockFs.listDirectory = vi.fn().mockReturnValue(entries)

      const result = ls.execute(['/tmp', 'extra', 'args'], mockFs)

      expect(result.exitCode).toBe(0)
      expect(mockFs.listDirectory).toHaveBeenCalledWith('/tmp')
    })
  })
})
