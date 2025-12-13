import { describe, it, expect, vi } from 'vitest'
import type { ICommand } from '../../src/interfaces/ICommand'
import type { IProcess } from '../../src/interfaces/IProcess'
import type { ShellContext } from '../../src/interfaces/ShellContext'
import type { IFileSystem } from '../../src/types'

describe('ICommand interface', () => {
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

  function createMockProcess(): IProcess {
    return {
      start: vi.fn(),
      stop: vi.fn(),
      isRunning: vi.fn(() => false),
      handleInput: vi.fn(),
      onOutput: vi.fn(),
      onError: vi.fn(),
      onExit: vi.fn(),
    }
  }

  it('should define name property', () => {
    const command: ICommand = {
      name: 'test',
      description: 'Test command',
      usage: 'test [args]',
      execute: () => undefined,
    }
    expect(command.name).toBe('test')
  })

  it('should define description property', () => {
    const command: ICommand = {
      name: 'test',
      description: 'A test command',
      usage: 'test [args]',
      execute: () => undefined,
    }
    expect(command.description).toBe('A test command')
  })

  it('should define usage property', () => {
    const command: ICommand = {
      name: 'test',
      description: 'Test command',
      usage: 'test [args]',
      execute: () => undefined,
    }
    expect(command.usage).toBe('test [args]')
  })

  describe('execute method', () => {
    it('should accept args and context parameters', () => {
      const executeFn = vi.fn(() => undefined)
      const command: ICommand = {
        name: 'test',
        description: 'Test command',
        usage: 'test [args]',
        execute: executeFn,
      }

      const context = createMockContext()
      command.execute(['arg1', 'arg2'], context)

      expect(executeFn).toHaveBeenCalledWith(['arg1', 'arg2'], context)
    })

    it('should allow returning void for simple commands', () => {
      const command: ICommand = {
        name: 'simple',
        description: 'Simple command',
        usage: 'simple',
        execute: (_args, context) => {
          context.output('Hello')
          return undefined
        },
      }

      const context = createMockContext()
      const result = command.execute([], context)

      expect(result).toBeUndefined()
      expect(context.output).toHaveBeenCalledWith('Hello')
    })

    it('should allow returning IProcess for long-running commands', () => {
      const mockProcess = createMockProcess()
      const command: ICommand = {
        name: 'repl',
        description: 'Interactive REPL',
        usage: 'repl',
        execute: () => mockProcess,
      }

      const context = createMockContext()
      const result = command.execute([], context)

      expect(result).toBe(mockProcess)
      expect(result?.start).toBeDefined()
      expect(result?.stop).toBeDefined()
      expect(result?.isRunning).toBeDefined()
    })
  })
})
