/**
 * Tests for clear command.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { clear } from '../../src/commands/clear'
import type { IFileSystem } from '../../src/types'

describe('clear command', () => {
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
      expect(clear.name).toBe('clear')
    })

    it('should have a description', () => {
      expect(clear.description).toBeTruthy()
      expect(typeof clear.description).toBe('string')
    })

    it('should have usage information', () => {
      expect(clear.usage).toBeTruthy()
      expect(typeof clear.usage).toBe('string')
    })
  })

  describe('execute', () => {
    it('should return exit code 0', () => {
      const result = clear.execute([], mockFs)

      expect(result.exitCode).toBe(0)
    })

    it('should return ANSI escape sequence to clear screen in stdout', () => {
      const result = clear.execute([], mockFs)

      // ANSI escape sequence: clear screen (\x1b[2J) and move cursor home (\x1b[H)
      expect(result.stdout).toBe('\x1b[2J\x1b[H')
    })

    it('should return empty stderr', () => {
      const result = clear.execute([], mockFs)

      expect(result.stderr).toBe('')
    })

    it('should ignore any arguments', () => {
      const result = clear.execute(['arg1', 'arg2'], mockFs)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('\x1b[2J\x1b[H')
    })

    it('should not interact with filesystem', () => {
      clear.execute([], mockFs)

      expect(mockFs.getCurrentDirectory).not.toHaveBeenCalled()
      expect(mockFs.exists).not.toHaveBeenCalled()
      expect(mockFs.readFile).not.toHaveBeenCalled()
      expect(mockFs.writeFile).not.toHaveBeenCalled()
    })
  })
})
