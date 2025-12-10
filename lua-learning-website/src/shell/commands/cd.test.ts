import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cdCommand } from './cd';
import type { ShellContext, IFileSystem } from '../types';

describe('cd command', () => {
  let mockContext: ShellContext;
  let mockFs: IFileSystem;

  beforeEach(() => {
    mockFs = {
      exists: vi.fn().mockReturnValue(true),
      isDirectory: vi.fn().mockReturnValue(true),
      listDirectory: vi.fn(),
      readFile: vi.fn(),
    };
    mockContext = {
      cwd: '/',
      fs: mockFs,
      write: vi.fn(),
      writeln: vi.fn(),
      setCwd: vi.fn(),
      previousCwd: '/',
      setPreviousCwd: vi.fn(),
    };
  });

  describe('metadata', () => {
    it('has correct name', () => {
      expect(cdCommand.name).toBe('cd');
    });

    it('has a description', () => {
      expect(cdCommand.description).toBeTruthy();
    });

    it('has usage info', () => {
      expect(cdCommand.usage).toBe('cd [directory]');
    });
  });

  describe('execute with path', () => {
    it('changes to specified directory', async () => {
      mockContext.cwd = '/';

      const result = await cdCommand.execute(['home'], mockContext);

      expect(mockContext.setCwd).toHaveBeenCalledWith('/home');
      expect(result.exitCode).toBe(0);
    });

    it('changes to nested directory', async () => {
      mockContext.cwd = '/home';

      const result = await cdCommand.execute(['user/documents'], mockContext);

      expect(mockContext.setCwd).toHaveBeenCalledWith('/home/user/documents');
      expect(result.exitCode).toBe(0);
    });

    it('changes to absolute path', async () => {
      mockContext.cwd = '/somewhere/else';

      const result = await cdCommand.execute(['/home/user'], mockContext);

      expect(mockContext.setCwd).toHaveBeenCalledWith('/home/user');
      expect(result.exitCode).toBe(0);
    });
  });

  describe('execute with .. (parent)', () => {
    it('moves up one directory', async () => {
      mockContext.cwd = '/home/user';

      const result = await cdCommand.execute(['..'], mockContext);

      expect(mockContext.setCwd).toHaveBeenCalledWith('/home');
      expect(result.exitCode).toBe(0);
    });

    it('stays at root when already at root', async () => {
      mockContext.cwd = '/';

      const result = await cdCommand.execute(['..'], mockContext);

      expect(mockContext.setCwd).toHaveBeenCalledWith('/');
      expect(result.exitCode).toBe(0);
    });

    it('handles multiple parent traversals', async () => {
      mockContext.cwd = '/home/user/documents';

      const result = await cdCommand.execute(['../..'], mockContext);

      expect(mockContext.setCwd).toHaveBeenCalledWith('/home');
      expect(result.exitCode).toBe(0);
    });

    it('handles parent then child', async () => {
      mockContext.cwd = '/home/user';

      const result = await cdCommand.execute(['../other'], mockContext);

      expect(mockContext.setCwd).toHaveBeenCalledWith('/home/other');
      expect(result.exitCode).toBe(0);
    });
  });

  describe('execute with ~ (home)', () => {
    it('changes to root with ~', async () => {
      mockContext.cwd = '/home/user/documents';

      const result = await cdCommand.execute(['~'], mockContext);

      expect(mockContext.setCwd).toHaveBeenCalledWith('/');
      expect(result.exitCode).toBe(0);
    });

    it('changes to root with no arguments', async () => {
      mockContext.cwd = '/home/user';

      const result = await cdCommand.execute([], mockContext);

      expect(mockContext.setCwd).toHaveBeenCalledWith('/');
      expect(result.exitCode).toBe(0);
    });
  });

  describe('execute with . (current)', () => {
    it('stays in current directory', async () => {
      mockContext.cwd = '/home/user';

      const result = await cdCommand.execute(['.'], mockContext);

      expect(mockContext.setCwd).toHaveBeenCalledWith('/home/user');
      expect(result.exitCode).toBe(0);
    });
  });

  describe('error handling', () => {
    it('returns error for non-existent directory', async () => {
      mockFs.exists = vi.fn().mockReturnValue(false);
      mockContext.cwd = '/';

      const result = await cdCommand.execute(['nonexistent'], mockContext);

      expect(mockContext.setCwd).not.toHaveBeenCalled();
      expect(result.exitCode).toBe(1);
      expect(result.error).toContain('nonexistent');
    });

    it('returns error when path is not a directory', async () => {
      mockFs.exists = vi.fn().mockReturnValue(true);
      mockFs.isDirectory = vi.fn().mockReturnValue(false);
      mockContext.cwd = '/';

      const result = await cdCommand.execute(['file.txt'], mockContext);

      expect(mockContext.setCwd).not.toHaveBeenCalled();
      expect(result.exitCode).toBe(1);
      expect(result.error).toContain('not a directory');
    });

    it('outputs error message to terminal', async () => {
      mockFs.exists = vi.fn().mockReturnValue(false);
      mockContext.cwd = '/';

      await cdCommand.execute(['nonexistent'], mockContext);

      expect(mockContext.writeln).toHaveBeenCalled();
    });
  });

  describe('previous directory tracking', () => {
    it('saves previous directory before changing', async () => {
      mockContext.cwd = '/home/user';

      await cdCommand.execute(['documents'], mockContext);

      expect(mockContext.setPreviousCwd).toHaveBeenCalledWith('/home/user');
    });

    it('does not save previous directory on error', async () => {
      mockFs.exists = vi.fn().mockReturnValue(false);
      mockContext.cwd = '/home/user';

      await cdCommand.execute(['nonexistent'], mockContext);

      expect(mockContext.setPreviousCwd).not.toHaveBeenCalled();
    });
  });

  describe('execute with - (previous directory)', () => {
    it('changes to previous directory', async () => {
      mockContext.cwd = '/home/user';
      mockContext.previousCwd = '/projects';

      const result = await cdCommand.execute(['-'], mockContext);

      expect(mockContext.setCwd).toHaveBeenCalledWith('/projects');
      expect(result.exitCode).toBe(0);
    });

    it('outputs the new directory when using cd -', async () => {
      mockContext.cwd = '/home/user';
      mockContext.previousCwd = '/projects';

      await cdCommand.execute(['-'], mockContext);

      expect(mockContext.writeln).toHaveBeenCalledWith('/projects');
    });

    it('swaps current and previous directories', async () => {
      mockContext.cwd = '/home/user';
      mockContext.previousCwd = '/projects';

      await cdCommand.execute(['-'], mockContext);

      expect(mockContext.setPreviousCwd).toHaveBeenCalledWith('/home/user');
    });
  });
});
