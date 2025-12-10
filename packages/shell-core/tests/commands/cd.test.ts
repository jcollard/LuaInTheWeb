/**
 * Tests for cd command.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { cd } from '../../src/commands/cd'
import type { IFileSystem } from '../../src/types'

describe('cd command', () => {
  let mockFs: IFileSystem

  beforeEach(() => {
    mockFs = {
      getCurrentDirectory: vi.fn().mockReturnValue('/home/user'),
      setCurrentDirectory: vi.fn(),
      exists: vi.fn().mockReturnValue(true),
      isDirectory: vi.fn().mockReturnValue(true),
      isFile: vi.fn().mockReturnValue(false),
      listDirectory: vi.fn(),
      readFile: vi.fn(),
      writeFile: vi.fn(),
      createDirectory: vi.fn(),
      delete: vi.fn(),
    }
  })

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(cd.name).toBe('cd')
    })

    it('should have a description', () => {
      expect(cd.description).toBeTruthy()
      expect(typeof cd.description).toBe('string')
    })

    it('should have usage information', () => {
      expect(cd.usage).toBeTruthy()
      expect(typeof cd.usage).toBe('string')
    })
  })

  describe('execute with valid path', () => {
    it('should change to absolute path', () => {
      const result = cd.execute(['/var/log'], mockFs)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('')
      expect(result.stderr).toBe('')
      expect(mockFs.setCurrentDirectory).toHaveBeenCalledWith('/var/log')
    })

    it('should change to relative path', () => {
      const result = cd.execute(['projects'], mockFs)

      expect(result.exitCode).toBe(0)
      expect(mockFs.setCurrentDirectory).toHaveBeenCalledWith('/home/user/projects')
    })

    it('should resolve parent directory (..) correctly', () => {
      const result = cd.execute(['..'], mockFs)

      expect(result.exitCode).toBe(0)
      expect(mockFs.setCurrentDirectory).toHaveBeenCalledWith('/home')
    })

    it('should resolve complex relative paths', () => {
      const result = cd.execute(['../other/folder'], mockFs)

      expect(result.exitCode).toBe(0)
      expect(mockFs.setCurrentDirectory).toHaveBeenCalledWith('/home/other/folder')
    })

    it('should resolve current directory (.) to same path', () => {
      const result = cd.execute(['.'], mockFs)

      expect(result.exitCode).toBe(0)
      expect(mockFs.setCurrentDirectory).toHaveBeenCalledWith('/home/user')
    })
  })

  describe('execute with no arguments', () => {
    it('should change to root directory when no args provided', () => {
      const result = cd.execute([], mockFs)

      expect(result.exitCode).toBe(0)
      expect(mockFs.setCurrentDirectory).toHaveBeenCalledWith('/')
    })
  })

  describe('execute with invalid path', () => {
    it('should return error when path does not exist', () => {
      mockFs.exists = vi.fn().mockReturnValue(false)

      const result = cd.execute(['/nonexistent'], mockFs)

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('no such file or directory')
      expect(result.stderr).toContain('/nonexistent')
      expect(result.stdout).toBe('')
      expect(mockFs.setCurrentDirectory).not.toHaveBeenCalled()
    })

    it('should return error when path is a file, not directory', () => {
      mockFs.exists = vi.fn().mockReturnValue(true)
      mockFs.isDirectory = vi.fn().mockReturnValue(false)
      mockFs.isFile = vi.fn().mockReturnValue(true)

      const result = cd.execute(['/home/user/file.txt'], mockFs)

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('not a directory')
      expect(result.stderr).toContain('/home/user/file.txt')
      expect(result.stdout).toBe('')
      expect(mockFs.setCurrentDirectory).not.toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('should handle root directory', () => {
      mockFs.getCurrentDirectory = vi.fn().mockReturnValue('/')

      const result = cd.execute(['..'], mockFs)

      expect(result.exitCode).toBe(0)
      // Going up from root stays at root
      expect(mockFs.setCurrentDirectory).toHaveBeenCalledWith('/')
    })

    it('should handle multiple slashes in path', () => {
      const result = cd.execute(['//var///log//'], mockFs)

      expect(result.exitCode).toBe(0)
      expect(mockFs.setCurrentDirectory).toHaveBeenCalledWith('/var/log')
    })

    it('should handle backslashes in path', () => {
      const result = cd.execute(['\\var\\log'], mockFs)

      expect(result.exitCode).toBe(0)
      expect(mockFs.setCurrentDirectory).toHaveBeenCalledWith('/var/log')
    })

    it('should ignore extra arguments', () => {
      const result = cd.execute(['/tmp', 'extra', 'args'], mockFs)

      expect(result.exitCode).toBe(0)
      expect(mockFs.setCurrentDirectory).toHaveBeenCalledWith('/tmp')
    })
  })
})
