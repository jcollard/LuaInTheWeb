import { describe, it, expect } from 'vitest';
import { parseCommand } from './parseCommand';

describe('parseCommand', () => {
  describe('basic parsing', () => {
    it('parses a simple command with no arguments', () => {
      const result = parseCommand('pwd');
      expect(result).toEqual({ command: 'pwd', args: [] });
    });

    it('parses a command with one argument', () => {
      const result = parseCommand('cd home');
      expect(result).toEqual({ command: 'cd', args: ['home'] });
    });

    it('parses a command with multiple arguments', () => {
      const result = parseCommand('ls -l /home/user');
      expect(result).toEqual({ command: 'ls', args: ['-l', '/home/user'] });
    });
  });

  describe('whitespace handling', () => {
    it('trims leading whitespace', () => {
      const result = parseCommand('   pwd');
      expect(result).toEqual({ command: 'pwd', args: [] });
    });

    it('trims trailing whitespace', () => {
      const result = parseCommand('pwd   ');
      expect(result).toEqual({ command: 'pwd', args: [] });
    });

    it('handles multiple spaces between arguments', () => {
      const result = parseCommand('cd    home');
      expect(result).toEqual({ command: 'cd', args: ['home'] });
    });

    it('handles tabs as whitespace', () => {
      const result = parseCommand('cd\thome');
      expect(result).toEqual({ command: 'cd', args: ['home'] });
    });
  });

  describe('edge cases', () => {
    it('returns empty command for empty string', () => {
      const result = parseCommand('');
      expect(result).toEqual({ command: '', args: [] });
    });

    it('returns empty command for whitespace-only string', () => {
      const result = parseCommand('   ');
      expect(result).toEqual({ command: '', args: [] });
    });

    it('converts command to lowercase', () => {
      const result = parseCommand('PWD');
      expect(result).toEqual({ command: 'pwd', args: [] });
    });

    it('preserves argument case', () => {
      const result = parseCommand('cd MyFolder');
      expect(result).toEqual({ command: 'cd', args: ['MyFolder'] });
    });
  });

  describe('path arguments', () => {
    it('handles absolute paths', () => {
      const result = parseCommand('cd /home/user/documents');
      expect(result).toEqual({ command: 'cd', args: ['/home/user/documents'] });
    });

    it('handles relative paths', () => {
      const result = parseCommand('cd ../parent');
      expect(result).toEqual({ command: 'cd', args: ['../parent'] });
    });

    it('handles dot paths', () => {
      const result = parseCommand('cd .');
      expect(result).toEqual({ command: 'cd', args: ['.'] });
    });

    it('handles home shortcut', () => {
      const result = parseCommand('cd ~');
      expect(result).toEqual({ command: 'cd', args: ['~'] });
    });
  });
});
