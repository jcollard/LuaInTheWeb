import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHelpCommand } from './help';
import { CommandRegistry } from '../CommandRegistry';
import type { ShellContext, IFileSystem, Command } from '../types';

const createMockCommand = (
  name: string,
  description: string,
  usage: string
): Command => ({
  name,
  description,
  usage,
  execute: vi.fn().mockResolvedValue({ exitCode: 0 }),
});

describe('help command', () => {
  let mockContext: ShellContext;
  let mockFs: IFileSystem;
  let registry: CommandRegistry;
  let outputLines: string[];

  beforeEach(() => {
    outputLines = [];
    mockFs = {
      exists: vi.fn(),
      isDirectory: vi.fn(),
      listDirectory: vi.fn(),
      readFile: vi.fn(),
    };
    mockContext = {
      cwd: '/',
      fs: mockFs,
      write: vi.fn((text) => outputLines.push(text)),
      writeln: vi.fn((text) => outputLines.push(text)),
      setCwd: vi.fn(),
      previousCwd: '/',
      setPreviousCwd: vi.fn(),
    };
    registry = new CommandRegistry();
  });

  describe('metadata', () => {
    it('has correct name', () => {
      const helpCommand = createHelpCommand(registry);
      expect(helpCommand.name).toBe('help');
    });

    it('has a description', () => {
      const helpCommand = createHelpCommand(registry);
      expect(helpCommand.description).toBeTruthy();
    });

    it('has usage info', () => {
      const helpCommand = createHelpCommand(registry);
      expect(helpCommand.usage).toBe('help [command]');
    });
  });

  describe('execute without arguments (list all commands)', () => {
    it('shows header', async () => {
      const helpCommand = createHelpCommand(registry);

      await helpCommand.execute([], mockContext);

      expect(outputLines.some((line) => line.includes('Available'))).toBe(true);
    });

    it('lists all registered commands', async () => {
      registry.register(createMockCommand('pwd', 'Print directory', 'pwd'));
      registry.register(createMockCommand('cd', 'Change directory', 'cd'));
      const helpCommand = createHelpCommand(registry);

      await helpCommand.execute([], mockContext);

      const output = outputLines.join('\n');
      expect(output).toContain('pwd');
      expect(output).toContain('cd');
    });

    it('shows command descriptions', async () => {
      registry.register(createMockCommand('pwd', 'Print directory', 'pwd'));
      const helpCommand = createHelpCommand(registry);

      await helpCommand.execute([], mockContext);

      const output = outputLines.join('\n');
      expect(output).toContain('Print directory');
    });

    it('returns exit code 0', async () => {
      const helpCommand = createHelpCommand(registry);

      const result = await helpCommand.execute([], mockContext);

      expect(result.exitCode).toBe(0);
    });
  });

  describe('execute with command name (show specific help)', () => {
    it('shows detailed help for specific command', async () => {
      registry.register(
        createMockCommand('ls', 'List directory contents', 'ls [path]')
      );
      const helpCommand = createHelpCommand(registry);

      await helpCommand.execute(['ls'], mockContext);

      const output = outputLines.join('\n');
      expect(output).toContain('ls');
      expect(output).toContain('List directory contents');
      expect(output).toContain('ls [path]');
    });

    it('shows usage for specific command', async () => {
      registry.register(
        createMockCommand('cd', 'Change directory', 'cd [directory]')
      );
      const helpCommand = createHelpCommand(registry);

      await helpCommand.execute(['cd'], mockContext);

      const output = outputLines.join('\n');
      expect(output).toContain('cd [directory]');
    });

    it('returns exit code 0 for valid command', async () => {
      registry.register(createMockCommand('pwd', 'Print directory', 'pwd'));
      const helpCommand = createHelpCommand(registry);

      const result = await helpCommand.execute(['pwd'], mockContext);

      expect(result.exitCode).toBe(0);
    });
  });

  describe('error handling', () => {
    it('returns error for unknown command', async () => {
      const helpCommand = createHelpCommand(registry);

      const result = await helpCommand.execute(['unknown'], mockContext);

      expect(result.exitCode).toBe(1);
      expect(result.error).toContain('unknown');
    });

    it('outputs error message for unknown command', async () => {
      const helpCommand = createHelpCommand(registry);

      await helpCommand.execute(['nonexistent'], mockContext);

      const output = outputLines.join('\n');
      expect(output).toContain('nonexistent');
      expect(output.toLowerCase()).toContain('not found');
    });
  });
});
