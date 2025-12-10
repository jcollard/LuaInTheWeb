import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pwdCommand } from './pwd';
import type { ShellContext, IFileSystem } from '../types';

describe('pwd command', () => {
  let mockContext: ShellContext;
  let mockFs: IFileSystem;
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
      writeln: vi.fn((text) => outputLines.push(text + '\n')),
      setCwd: vi.fn(),
      previousCwd: '/',
      setPreviousCwd: vi.fn(),
    };
  });

  describe('metadata', () => {
    it('has correct name', () => {
      expect(pwdCommand.name).toBe('pwd');
    });

    it('has a description', () => {
      expect(pwdCommand.description).toBeTruthy();
    });

    it('has usage info', () => {
      expect(pwdCommand.usage).toBe('pwd');
    });
  });

  describe('execute', () => {
    it('outputs the current directory', async () => {
      mockContext.cwd = '/home/user';

      const result = await pwdCommand.execute([], mockContext);

      expect(mockContext.writeln).toHaveBeenCalledWith('/home/user');
      expect(result.exitCode).toBe(0);
    });

    it('outputs root directory when at root', async () => {
      mockContext.cwd = '/';

      const result = await pwdCommand.execute([], mockContext);

      expect(mockContext.writeln).toHaveBeenCalledWith('/');
      expect(result.exitCode).toBe(0);
    });

    it('ignores any arguments', async () => {
      mockContext.cwd = '/test';

      const result = await pwdCommand.execute(['ignored', 'args'], mockContext);

      expect(mockContext.writeln).toHaveBeenCalledWith('/test');
      expect(result.exitCode).toBe(0);
    });

    it('outputs nested directory paths', async () => {
      mockContext.cwd = '/home/user/projects/myapp';

      const result = await pwdCommand.execute([], mockContext);

      expect(mockContext.writeln).toHaveBeenCalledWith(
        '/home/user/projects/myapp'
      );
      expect(result.exitCode).toBe(0);
    });
  });
});
