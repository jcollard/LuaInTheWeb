import { describe, it, expect, vi } from 'vitest'
import { LegacyCommandAdapter } from '../../src/adapters/LegacyCommandAdapter'
import type { Command, IFileSystem } from '../../src/types'
import type { ShellContext } from '../../src/interfaces/ShellContext'

describe('LegacyCommandAdapter', () => {
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

  function createMockContext(): ShellContext {
    return {
      cwd: '/home/user',
      filesystem: mockFileSystem,
      output: vi.fn(),
      error: vi.fn(),
    }
  }

  describe('adapt', () => {
    it('should preserve command name', () => {
      const legacyCommand: Command = {
        name: 'test',
        description: 'Test command',
        usage: 'test [args]',
        execute: () => ({ exitCode: 0, stdout: '', stderr: '' }),
      }

      const adapted = LegacyCommandAdapter.adapt(legacyCommand)

      expect(adapted.name).toBe('test')
    })

    it('should preserve command description', () => {
      const legacyCommand: Command = {
        name: 'test',
        description: 'A test command',
        usage: 'test',
        execute: () => ({ exitCode: 0, stdout: '', stderr: '' }),
      }

      const adapted = LegacyCommandAdapter.adapt(legacyCommand)

      expect(adapted.description).toBe('A test command')
    })

    it('should preserve command usage', () => {
      const legacyCommand: Command = {
        name: 'test',
        description: 'Test command',
        usage: 'test [options]',
        execute: () => ({ exitCode: 0, stdout: '', stderr: '' }),
      }

      const adapted = LegacyCommandAdapter.adapt(legacyCommand)

      expect(adapted.usage).toBe('test [options]')
    })
  })

  describe('execute', () => {
    it('should pass args to legacy command', () => {
      const executeFn = vi.fn(() => ({ exitCode: 0, stdout: '', stderr: '' }))
      const legacyCommand: Command = {
        name: 'test',
        description: 'Test',
        usage: 'test',
        execute: executeFn,
      }

      const adapted = LegacyCommandAdapter.adapt(legacyCommand)
      const context = createMockContext()

      adapted.execute(['arg1', 'arg2'], context)

      expect(executeFn).toHaveBeenCalledWith(['arg1', 'arg2'], context.filesystem)
    })

    it('should output stdout to context.output', () => {
      const legacyCommand: Command = {
        name: 'test',
        description: 'Test',
        usage: 'test',
        execute: () => ({ exitCode: 0, stdout: 'Hello World', stderr: '' }),
      }

      const adapted = LegacyCommandAdapter.adapt(legacyCommand)
      const context = createMockContext()

      adapted.execute([], context)

      expect(context.output).toHaveBeenCalledWith('Hello World')
    })

    it('should not call output if stdout is empty', () => {
      const legacyCommand: Command = {
        name: 'test',
        description: 'Test',
        usage: 'test',
        execute: () => ({ exitCode: 0, stdout: '', stderr: '' }),
      }

      const adapted = LegacyCommandAdapter.adapt(legacyCommand)
      const context = createMockContext()

      adapted.execute([], context)

      expect(context.output).not.toHaveBeenCalled()
    })

    it('should output stderr to context.error', () => {
      const legacyCommand: Command = {
        name: 'test',
        description: 'Test',
        usage: 'test',
        execute: () => ({ exitCode: 1, stdout: '', stderr: 'Error occurred' }),
      }

      const adapted = LegacyCommandAdapter.adapt(legacyCommand)
      const context = createMockContext()

      adapted.execute([], context)

      expect(context.error).toHaveBeenCalledWith('Error occurred')
    })

    it('should not call error if stderr is empty', () => {
      const legacyCommand: Command = {
        name: 'test',
        description: 'Test',
        usage: 'test',
        execute: () => ({ exitCode: 1, stdout: '', stderr: '' }),
      }

      const adapted = LegacyCommandAdapter.adapt(legacyCommand)
      const context = createMockContext()

      adapted.execute([], context)

      expect(context.error).not.toHaveBeenCalled()
    })

    it('should return void (not IProcess) for legacy commands', () => {
      const legacyCommand: Command = {
        name: 'test',
        description: 'Test',
        usage: 'test',
        execute: () => ({ exitCode: 0, stdout: 'output', stderr: '' }),
      }

      const adapted = LegacyCommandAdapter.adapt(legacyCommand)
      const context = createMockContext()

      const result = adapted.execute([], context)

      expect(result).toBeUndefined()
    })

    it('should handle both stdout and stderr', () => {
      const legacyCommand: Command = {
        name: 'test',
        description: 'Test',
        usage: 'test',
        execute: () => ({ exitCode: 1, stdout: 'some output', stderr: 'some error' }),
      }

      const adapted = LegacyCommandAdapter.adapt(legacyCommand)
      const context = createMockContext()

      adapted.execute([], context)

      expect(context.output).toHaveBeenCalledWith('some output')
      expect(context.error).toHaveBeenCalledWith('some error')
    })
  })
})
