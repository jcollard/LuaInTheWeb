import { describe, it, expect, vi } from 'vitest';
import { CommandRegistry } from './CommandRegistry';
import type { Command } from './types';

const createMockCommand = (name: string): Command => ({
  name,
  description: `Test ${name} command`,
  usage: name,
  execute: vi.fn().mockResolvedValue({ exitCode: 0 }),
});

describe('CommandRegistry', () => {
  describe('register', () => {
    it('registers a command', () => {
      const registry = new CommandRegistry();
      const cmd = createMockCommand('test');

      registry.register(cmd);

      expect(registry.get('test')).toBe(cmd);
    });

    it('allows registering multiple commands', () => {
      const registry = new CommandRegistry();
      const cmd1 = createMockCommand('cmd1');
      const cmd2 = createMockCommand('cmd2');

      registry.register(cmd1);
      registry.register(cmd2);

      expect(registry.get('cmd1')).toBe(cmd1);
      expect(registry.get('cmd2')).toBe(cmd2);
    });

    it('throws error when registering duplicate command', () => {
      const registry = new CommandRegistry();
      const cmd = createMockCommand('test');

      registry.register(cmd);

      expect(() => registry.register(cmd)).toThrow(
        'Command "test" is already registered'
      );
    });
  });

  describe('get', () => {
    it('returns undefined for unregistered command', () => {
      const registry = new CommandRegistry();

      expect(registry.get('nonexistent')).toBeUndefined();
    });

    it('is case-insensitive', () => {
      const registry = new CommandRegistry();
      const cmd = createMockCommand('test');

      registry.register(cmd);

      expect(registry.get('TEST')).toBe(cmd);
      expect(registry.get('Test')).toBe(cmd);
    });
  });

  describe('has', () => {
    it('returns true for registered command', () => {
      const registry = new CommandRegistry();
      const cmd = createMockCommand('test');

      registry.register(cmd);

      expect(registry.has('test')).toBe(true);
    });

    it('returns false for unregistered command', () => {
      const registry = new CommandRegistry();

      expect(registry.has('nonexistent')).toBe(false);
    });

    it('is case-insensitive', () => {
      const registry = new CommandRegistry();
      const cmd = createMockCommand('test');

      registry.register(cmd);

      expect(registry.has('TEST')).toBe(true);
    });
  });

  describe('list', () => {
    it('returns empty array for empty registry', () => {
      const registry = new CommandRegistry();

      expect(registry.list()).toEqual([]);
    });

    it('returns all registered commands', () => {
      const registry = new CommandRegistry();
      const cmd1 = createMockCommand('aaa');
      const cmd2 = createMockCommand('bbb');

      registry.register(cmd1);
      registry.register(cmd2);

      const list = registry.list();
      expect(list).toHaveLength(2);
      expect(list).toContain(cmd1);
      expect(list).toContain(cmd2);
    });

    it('returns commands sorted by name', () => {
      const registry = new CommandRegistry();
      const cmdZ = createMockCommand('zzz');
      const cmdA = createMockCommand('aaa');
      const cmdM = createMockCommand('mmm');

      registry.register(cmdZ);
      registry.register(cmdA);
      registry.register(cmdM);

      const list = registry.list();
      expect(list[0].name).toBe('aaa');
      expect(list[1].name).toBe('mmm');
      expect(list[2].name).toBe('zzz');
    });
  });

  describe('getNames', () => {
    it('returns empty array for empty registry', () => {
      const registry = new CommandRegistry();

      expect(registry.getNames()).toEqual([]);
    });

    it('returns sorted command names', () => {
      const registry = new CommandRegistry();
      registry.register(createMockCommand('pwd'));
      registry.register(createMockCommand('cd'));
      registry.register(createMockCommand('ls'));

      expect(registry.getNames()).toEqual(['cd', 'ls', 'pwd']);
    });
  });
});
