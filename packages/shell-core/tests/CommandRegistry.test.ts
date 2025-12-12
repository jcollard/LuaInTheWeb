import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CommandRegistry } from '../src/CommandRegistry'
import type { Command, IFileSystem, CommandResult } from '../src/types'
import type { ICommand } from '../src/interfaces/ICommand'
import type { IProcess } from '../src/interfaces/IProcess'
import type { ShellContext } from '../src/interfaces/ShellContext'

// Mock command factory for testing
function createMockCommand(name: string, description = 'Test command'): Command {
  return {
    name,
    description,
    usage: `${name} [args]`,
    execute: (): CommandResult => ({ exitCode: 0, stdout: '', stderr: '' }),
  }
}

describe('CommandRegistry', () => {
  let registry: CommandRegistry

  beforeEach(() => {
    registry = new CommandRegistry()
  })

  describe('register', () => {
    it('should register a command', () => {
      const cmd = createMockCommand('test')
      registry.register(cmd)
      expect(registry.get('test')).toBe(cmd)
    })

    it('should register multiple commands', () => {
      const cmd1 = createMockCommand('cmd1')
      const cmd2 = createMockCommand('cmd2')
      registry.register(cmd1)
      registry.register(cmd2)
      expect(registry.get('cmd1')).toBe(cmd1)
      expect(registry.get('cmd2')).toBe(cmd2)
    })

    it('should throw error when registering duplicate command name', () => {
      const cmd1 = createMockCommand('test')
      const cmd2 = createMockCommand('test', 'Different description')
      registry.register(cmd1)
      expect(() => registry.register(cmd2)).toThrow(
        "Command 'test' is already registered"
      )
    })

    it('should return the registry instance for chaining', () => {
      const cmd = createMockCommand('test')
      const result = registry.register(cmd)
      expect(result).toBe(registry)
    })
  })

  describe('get', () => {
    it('should return registered command by name', () => {
      const cmd = createMockCommand('mycommand')
      registry.register(cmd)
      expect(registry.get('mycommand')).toBe(cmd)
    })

    it('should return undefined for non-existent command', () => {
      expect(registry.get('nonexistent')).toBeUndefined()
    })

    it('should be case-sensitive', () => {
      const cmd = createMockCommand('Test')
      registry.register(cmd)
      expect(registry.get('Test')).toBe(cmd)
      expect(registry.get('test')).toBeUndefined()
      expect(registry.get('TEST')).toBeUndefined()
    })
  })

  describe('has', () => {
    it('should return true for registered command', () => {
      const cmd = createMockCommand('exists')
      registry.register(cmd)
      expect(registry.has('exists')).toBe(true)
    })

    it('should return false for non-existent command', () => {
      expect(registry.has('nothere')).toBe(false)
    })
  })

  describe('list', () => {
    it('should return empty array when no commands registered', () => {
      expect(registry.list()).toEqual([])
    })

    it('should return all registered commands', () => {
      const cmd1 = createMockCommand('alpha')
      const cmd2 = createMockCommand('beta')
      const cmd3 = createMockCommand('gamma')
      registry.register(cmd1)
      registry.register(cmd2)
      registry.register(cmd3)

      const list = registry.list()
      expect(list).toHaveLength(3)
      expect(list).toContain(cmd1)
      expect(list).toContain(cmd2)
      expect(list).toContain(cmd3)
    })

    it('should return commands in insertion order', () => {
      const cmd1 = createMockCommand('first')
      const cmd2 = createMockCommand('second')
      const cmd3 = createMockCommand('third')
      registry.register(cmd1)
      registry.register(cmd2)
      registry.register(cmd3)

      const list = registry.list()
      expect(list[0]).toBe(cmd1)
      expect(list[1]).toBe(cmd2)
      expect(list[2]).toBe(cmd3)
    })
  })

  describe('names', () => {
    it('should return empty array when no commands registered', () => {
      expect(registry.names()).toEqual([])
    })

    it('should return all registered command names', () => {
      registry.register(createMockCommand('cd'))
      registry.register(createMockCommand('ls'))
      registry.register(createMockCommand('pwd'))

      const names = registry.names()
      expect(names).toHaveLength(3)
      expect(names).toContain('cd')
      expect(names).toContain('ls')
      expect(names).toContain('pwd')
    })
  })

  describe('size', () => {
    it('should return 0 for empty registry', () => {
      expect(registry.size).toBe(0)
    })

    it('should return correct count after registering commands', () => {
      registry.register(createMockCommand('a'))
      expect(registry.size).toBe(1)
      registry.register(createMockCommand('b'))
      expect(registry.size).toBe(2)
      registry.register(createMockCommand('c'))
      expect(registry.size).toBe(3)
    })
  })

  describe('unregister', () => {
    it('should remove a registered command', () => {
      const cmd = createMockCommand('removeme')
      registry.register(cmd)
      expect(registry.has('removeme')).toBe(true)

      const result = registry.unregister('removeme')
      expect(result).toBe(true)
      expect(registry.has('removeme')).toBe(false)
      expect(registry.get('removeme')).toBeUndefined()
    })

    it('should return false when unregistering non-existent command', () => {
      expect(registry.unregister('nothere')).toBe(false)
    })

    it('should not affect other commands when unregistering', () => {
      const cmd1 = createMockCommand('keep')
      const cmd2 = createMockCommand('remove')
      registry.register(cmd1)
      registry.register(cmd2)

      registry.unregister('remove')
      expect(registry.has('keep')).toBe(true)
      expect(registry.get('keep')).toBe(cmd1)
    })
  })

  describe('clear', () => {
    it('should remove all commands', () => {
      registry.register(createMockCommand('a'))
      registry.register(createMockCommand('b'))
      registry.register(createMockCommand('c'))
      expect(registry.size).toBe(3)

      registry.clear()
      expect(registry.size).toBe(0)
      expect(registry.list()).toEqual([])
    })

    it('should be safe to call on empty registry', () => {
      expect(() => registry.clear()).not.toThrow()
      expect(registry.size).toBe(0)
    })
  })

  describe('execute', () => {
    it('should execute a registered command with arguments', () => {
      const mockFs: IFileSystem = {
        getCurrentDirectory: () => '/',
        setCurrentDirectory: () => {},
        exists: () => true,
        isDirectory: () => true,
        isFile: () => false,
        listDirectory: () => [],
        readFile: () => '',
        writeFile: () => {},
        createDirectory: () => {},
        delete: () => {},
      }

      const cmd: Command = {
        name: 'echo',
        description: 'Echo arguments',
        usage: 'echo [text]',
        execute: (args: string[]): CommandResult => ({
          exitCode: 0,
          stdout: args.join(' '),
          stderr: '',
        }),
      }

      registry.register(cmd)
      const result = registry.execute('echo', ['hello', 'world'], mockFs)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('hello world')
      expect(result.stderr).toBe('')
    })

    it('should return error result for non-existent command', () => {
      const mockFs: IFileSystem = {
        getCurrentDirectory: () => '/',
        setCurrentDirectory: () => {},
        exists: () => true,
        isDirectory: () => true,
        isFile: () => false,
        listDirectory: () => [],
        readFile: () => '',
        writeFile: () => {},
        createDirectory: () => {},
        delete: () => {},
      }

      const result = registry.execute('nonexistent', [], mockFs)
      expect(result.exitCode).toBe(127)
      expect(result.stderr).toBe("Command not found: nonexistent")
      expect(result.stdout).toBe('')
    })
  })

  describe('executeWithContext', () => {
    const mockFileSystem: IFileSystem = {
      getCurrentDirectory: () => '/',
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
        cwd: '/home',
        filesystem: mockFileSystem,
        output: vi.fn(),
        error: vi.fn(),
      }
    }

    it('should execute legacy command with context using adapter', () => {
      const cmd: Command = {
        name: 'legacy',
        description: 'Legacy command',
        usage: 'legacy',
        execute: (): CommandResult => ({
          exitCode: 0,
          stdout: 'Legacy output',
          stderr: '',
        }),
      }

      registry.register(cmd)
      const context = createMockContext()
      const result = registry.executeWithContext('legacy', [], context)

      expect(result).toBeUndefined()
      expect(context.output).toHaveBeenCalledWith('Legacy output')
    })

    it('should pass arguments to legacy command', () => {
      const executeFn = vi.fn(() => ({ exitCode: 0, stdout: '', stderr: '' }))
      const cmd: Command = {
        name: 'argstest',
        description: 'Test args',
        usage: 'argstest',
        execute: executeFn,
      }

      registry.register(cmd)
      const context = createMockContext()
      registry.executeWithContext('argstest', ['arg1', 'arg2'], context)

      expect(executeFn).toHaveBeenCalledWith(['arg1', 'arg2'], context.filesystem)
    })

    it('should output stderr to context.error for legacy commands', () => {
      const cmd: Command = {
        name: 'errortest',
        description: 'Error test',
        usage: 'errortest',
        execute: (): CommandResult => ({
          exitCode: 1,
          stdout: '',
          stderr: 'An error occurred',
        }),
      }

      registry.register(cmd)
      const context = createMockContext()
      registry.executeWithContext('errortest', [], context)

      expect(context.error).toHaveBeenCalledWith('An error occurred')
    })

    it('should return error message for non-existent command', () => {
      const context = createMockContext()
      const result = registry.executeWithContext('nonexistent', [], context)

      expect(result).toBeUndefined()
      expect(context.error).toHaveBeenCalledWith('Command not found: nonexistent')
    })
  })

  describe('registerICommand', () => {
    const mockFileSystem: IFileSystem = {
      getCurrentDirectory: () => '/',
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
        cwd: '/home',
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

    it('should register ICommand', () => {
      const iCmd: ICommand = {
        name: 'newcmd',
        description: 'New style command',
        usage: 'newcmd',
        execute: () => undefined,
      }

      registry.registerICommand(iCmd)
      expect(registry.has('newcmd')).toBe(true)
    })

    it('should execute ICommand that returns void', () => {
      const executeFn = vi.fn(() => undefined)
      const iCmd: ICommand = {
        name: 'simple',
        description: 'Simple command',
        usage: 'simple',
        execute: executeFn,
      }

      registry.registerICommand(iCmd)
      const context = createMockContext()
      const result = registry.executeWithContext('simple', ['arg'], context)

      expect(executeFn).toHaveBeenCalledWith(['arg'], context)
      expect(result).toBeUndefined()
    })

    it('should execute ICommand that returns IProcess', () => {
      const mockProcess = createMockProcess()
      const iCmd: ICommand = {
        name: 'repl',
        description: 'Interactive REPL',
        usage: 'repl',
        execute: () => mockProcess,
      }

      registry.registerICommand(iCmd)
      const context = createMockContext()
      const result = registry.executeWithContext('repl', [], context)

      expect(result).toBe(mockProcess)
    })

    it('should throw error when registering duplicate ICommand name', () => {
      const iCmd1: ICommand = {
        name: 'dup',
        description: 'First',
        usage: 'dup',
        execute: () => undefined,
      }
      const iCmd2: ICommand = {
        name: 'dup',
        description: 'Second',
        usage: 'dup',
        execute: () => undefined,
      }

      registry.registerICommand(iCmd1)
      expect(() => registry.registerICommand(iCmd2)).toThrow(
        "Command 'dup' is already registered"
      )
    })

    it('should allow ICommand to output via context', () => {
      const iCmd: ICommand = {
        name: 'outputcmd',
        description: 'Outputs text',
        usage: 'outputcmd',
        execute: (_args, context) => {
          context.output('Hello from ICommand')
          return undefined
        },
      }

      registry.registerICommand(iCmd)
      const context = createMockContext()
      registry.executeWithContext('outputcmd', [], context)

      expect(context.output).toHaveBeenCalledWith('Hello from ICommand')
    })
  })
})
