import { describe, it, expect, beforeEach } from 'vitest'
import { CommandRegistry } from '../src/CommandRegistry'
import type { Command, IFileSystem, CommandResult } from '../src/types'

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
})
