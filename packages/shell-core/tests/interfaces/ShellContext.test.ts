import { describe, it, expect, vi } from 'vitest'
import type { ShellContext } from '../../src/interfaces/ShellContext'
import type { IFileSystem } from '../../src/types'

describe('ShellContext interface', () => {
  const mockFileSystem: IFileSystem = {
    getCurrentDirectory: () => '/home',
    setCurrentDirectory: vi.fn(),
    exists: () => true,
    isDirectory: () => true,
    isFile: () => false,
    listDirectory: () => [],
    readFile: () => '',
    writeFile: vi.fn(),
    createDirectory: vi.fn(),
    delete: vi.fn(),
  }

  it('should define cwd as a string', () => {
    const context: ShellContext = {
      cwd: '/home/user',
      filesystem: mockFileSystem,
      output: vi.fn(),
      error: vi.fn(),
    }
    expect(typeof context.cwd).toBe('string')
  })

  it('should define filesystem property', () => {
    const context: ShellContext = {
      cwd: '/home/user',
      filesystem: mockFileSystem,
      output: vi.fn(),
      error: vi.fn(),
    }
    expect(context.filesystem).toBeDefined()
    expect(context.filesystem.getCurrentDirectory).toBeDefined()
  })

  it('should define output function that accepts a string', () => {
    const outputFn = vi.fn()
    const context: ShellContext = {
      cwd: '/home/user',
      filesystem: mockFileSystem,
      output: outputFn,
      error: vi.fn(),
    }

    context.output('test message')
    expect(outputFn).toHaveBeenCalledWith('test message')
  })

  it('should define error function that accepts a string', () => {
    const errorFn = vi.fn()
    const context: ShellContext = {
      cwd: '/home/user',
      filesystem: mockFileSystem,
      output: vi.fn(),
      error: errorFn,
    }

    context.error('error message')
    expect(errorFn).toHaveBeenCalledWith('error message')
  })

  describe('onRequestOpenFile callback', () => {
    it('should allow optional onRequestOpenFile callback', () => {
      const context: ShellContext = {
        cwd: '/home/user',
        filesystem: mockFileSystem,
        output: vi.fn(),
        error: vi.fn(),
      }
      expect(context.onRequestOpenFile).toBeUndefined()
    })

    it('should call onRequestOpenFile callback with file path when provided', () => {
      const openFileFn = vi.fn()
      const context: ShellContext = {
        cwd: '/home/user',
        filesystem: mockFileSystem,
        output: vi.fn(),
        error: vi.fn(),
        onRequestOpenFile: openFileFn,
      }

      context.onRequestOpenFile?.('/home/user/test.txt')
      expect(openFileFn).toHaveBeenCalledWith('/home/user/test.txt')
    })
  })
})
