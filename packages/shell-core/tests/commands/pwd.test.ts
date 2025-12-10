/**
 * Tests for pwd command.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { pwd } from '../../src/commands/pwd'
import type { IFileSystem } from '../../src/types'

describe('pwd command', () => {
  let mockFs: IFileSystem

  beforeEach(() => {
    mockFs = {
      getCurrentDirectory: vi.fn().mockReturnValue('/home/user'),
      setCurrentDirectory: vi.fn(),
      exists: vi.fn(),
      isDirectory: vi.fn(),
      isFile: vi.fn(),
      listDirectory: vi.fn(),
      readFile: vi.fn(),
      writeFile: vi.fn(),
      createDirectory: vi.fn(),
      delete: vi.fn(),
    }
  })

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(pwd.name).toBe('pwd')
    })

    it('should have a description', () => {
      expect(pwd.description).toBeTruthy()
      expect(typeof pwd.description).toBe('string')
    })

    it('should have usage information', () => {
      expect(pwd.usage).toBeTruthy()
      expect(typeof pwd.usage).toBe('string')
    })
  })

  describe('execute', () => {
    it('should return current directory from filesystem', () => {
      const result = pwd.execute([], mockFs)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('/home/user')
      expect(result.stderr).toBe('')
    })

    it('should call getCurrentDirectory on filesystem', () => {
      pwd.execute([], mockFs)

      expect(mockFs.getCurrentDirectory).toHaveBeenCalledTimes(1)
    })

    it('should return different paths based on filesystem state', () => {
      mockFs.getCurrentDirectory = vi.fn().mockReturnValue('/var/log')

      const result = pwd.execute([], mockFs)

      expect(result.stdout).toBe('/var/log')
    })

    it('should return root directory correctly', () => {
      mockFs.getCurrentDirectory = vi.fn().mockReturnValue('/')

      const result = pwd.execute([], mockFs)

      expect(result.stdout).toBe('/')
    })

    it('should ignore any arguments passed', () => {
      const result = pwd.execute(['ignored', 'args'], mockFs)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('/home/user')
    })
  })
})
