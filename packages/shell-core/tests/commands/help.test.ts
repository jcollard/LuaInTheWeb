/**
 * Tests for help command.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createHelpCommand } from '../../src/commands/help'
import { CommandRegistry } from '../../src/CommandRegistry'
import type { IFileSystem, Command } from '../../src/types'

describe('help command', () => {
  let mockFs: IFileSystem
  let registry: CommandRegistry
  let help: Command

  beforeEach(() => {
    mockFs = {
      getCurrentDirectory: vi.fn().mockReturnValue('/'),
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

    registry = new CommandRegistry()

    // Register some test commands
    registry.register({
      name: 'test1',
      description: 'Test command 1',
      usage: 'test1 [args]',
      execute: () => ({ exitCode: 0, stdout: '', stderr: '' }),
    })
    registry.register({
      name: 'test2',
      description: 'Test command 2',
      usage: 'test2 <required>',
      execute: () => ({ exitCode: 0, stdout: '', stderr: '' }),
    })

    help = createHelpCommand(registry)
  })

  describe('metadata', () => {
    it('should have correct name', () => {
      expect(help.name).toBe('help')
    })

    it('should have a description', () => {
      expect(help.description).toBeTruthy()
      expect(typeof help.description).toBe('string')
    })

    it('should have usage information', () => {
      expect(help.usage).toBeTruthy()
      expect(typeof help.usage).toBe('string')
    })
  })

  describe('execute with no arguments (list all commands)', () => {
    it('should list all registered commands', () => {
      const result = help.execute([], mockFs)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('test1')
      expect(result.stdout).toContain('test2')
    })

    it('should show descriptions for each command', () => {
      const result = help.execute([], mockFs)

      expect(result.stdout).toContain('Test command 1')
      expect(result.stdout).toContain('Test command 2')
    })

    it('should include help command itself', () => {
      // Register help command so it shows up
      registry.register(help)

      const result = help.execute([], mockFs)

      expect(result.stdout).toContain('help')
    })

    it('should show header message', () => {
      const result = help.execute([], mockFs)

      expect(result.stdout).toContain('Available commands')
    })
  })

  describe('execute with command name argument', () => {
    it('should show detailed help for specific command', () => {
      const result = help.execute(['test1'], mockFs)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('test1')
      expect(result.stdout).toContain('Test command 1')
      expect(result.stdout).toContain('test1 [args]')
    })

    it('should return error for unknown command', () => {
      const result = help.execute(['unknown'], mockFs)

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('unknown')
      expect(result.stderr).toContain('not found')
    })
  })

  describe('output formatting', () => {
    it('should sort commands alphabetically', () => {
      // Clear and add commands in non-alphabetical order
      registry.clear()
      registry.register({
        name: 'zebra',
        description: 'Z command',
        usage: 'zebra',
        execute: () => ({ exitCode: 0, stdout: '', stderr: '' }),
      })
      registry.register({
        name: 'alpha',
        description: 'A command',
        usage: 'alpha',
        execute: () => ({ exitCode: 0, stdout: '', stderr: '' }),
      })

      const result = help.execute([], mockFs)
      const alphaIndex = result.stdout.indexOf('alpha')
      const zebraIndex = result.stdout.indexOf('zebra')

      expect(alphaIndex).toBeLessThan(zebraIndex)
    })
  })

  describe('edge cases', () => {
    it('should handle empty registry', () => {
      registry.clear()

      const result = help.execute([], mockFs)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('No commands available')
      expect(result.stderr).toBe('')
    })

    it('should ignore extra arguments for specific command help', () => {
      const result = help.execute(['test1', 'extra', 'args'], mockFs)

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('test1')
    })
  })

  describe('output format details', () => {
    it('should return empty stderr on success for command list', () => {
      const result = help.execute([], mockFs)

      expect(result.stderr).toBe('')
    })

    it('should return empty stderr on success for specific command', () => {
      const result = help.execute(['test1'], mockFs)

      expect(result.stderr).toBe('')
    })

    it('should return empty stdout on error', () => {
      const result = help.execute(['nonexistent'], mockFs)

      expect(result.stdout).toBe('')
    })

    it('should include footer with usage hint in command list', () => {
      const result = help.execute([], mockFs)

      expect(result.stdout).toContain('help <command>')
    })

    it('should have output formatted with newlines between sections', () => {
      const result = help.execute([], mockFs)
      const lines = result.stdout.split('\n')

      // Should have header, blank line, commands, blank line, footer
      expect(lines.length).toBeGreaterThan(3)
      // Check for proper newline separation
      expect(lines.some((line) => line === '')).toBe(true)
    })

    it('should format detailed help with Usage prefix', () => {
      const result = help.execute(['test1'], mockFs)

      expect(result.stdout).toContain('Usage: test1 [args]')
    })

    it('should have blank line between description and usage in detailed help', () => {
      const result = help.execute(['test1'], mockFs)
      const lines = result.stdout.split('\n')

      // Format is: "name - description", "", "Usage: ..."
      expect(lines[1]).toBe('')
    })
  })
})
