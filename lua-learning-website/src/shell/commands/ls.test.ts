import { describe, it, expect, vi, beforeEach } from 'vitest';
import { lsCommand } from './ls';
import type { ShellContext, IFileSystem, FileEntry } from '../types';

describe('ls command', () => {
  let mockContext: ShellContext;
  let mockFs: IFileSystem;
  let outputLines: string[];

  beforeEach(() => {
    outputLines = [];
    mockFs = {
      exists: vi.fn().mockReturnValue(true),
      isDirectory: vi.fn().mockReturnValue(true),
      listDirectory: vi.fn().mockReturnValue([]),
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
  });

  describe('metadata', () => {
    it('has correct name', () => {
      expect(lsCommand.name).toBe('ls');
    });

    it('has a description', () => {
      expect(lsCommand.description).toBeTruthy();
    });

    it('has usage info', () => {
      expect(lsCommand.usage).toBe('ls [directory]');
    });
  });

  describe('execute in current directory', () => {
    it('lists current directory when no args', async () => {
      const entries: FileEntry[] = [
        { name: 'file.txt', isDirectory: false },
        { name: 'folder', isDirectory: true },
      ];
      mockFs.listDirectory = vi.fn().mockReturnValue(entries);

      const result = await lsCommand.execute([], mockContext);

      expect(mockFs.listDirectory).toHaveBeenCalledWith('/');
      expect(result.exitCode).toBe(0);
    });

    it('outputs nothing for empty directory', async () => {
      mockFs.listDirectory = vi.fn().mockReturnValue([]);

      const result = await lsCommand.execute([], mockContext);

      expect(result.exitCode).toBe(0);
      expect(mockContext.writeln).not.toHaveBeenCalled();
    });
  });

  describe('output formatting', () => {
    it('shows directories with trailing slash', async () => {
      const entries: FileEntry[] = [{ name: 'folder', isDirectory: true }];
      mockFs.listDirectory = vi.fn().mockReturnValue(entries);

      await lsCommand.execute([], mockContext);

      expect(mockContext.writeln).toHaveBeenCalledWith('folder/');
    });

    it('shows files without trailing slash', async () => {
      const entries: FileEntry[] = [{ name: 'file.txt', isDirectory: false }];
      mockFs.listDirectory = vi.fn().mockReturnValue(entries);

      await lsCommand.execute([], mockContext);

      expect(mockContext.writeln).toHaveBeenCalledWith('file.txt');
    });

    it('shows directories before files', async () => {
      const entries: FileEntry[] = [
        { name: 'aaa.txt', isDirectory: false },
        { name: 'zzz', isDirectory: true },
        { name: 'bbb.txt', isDirectory: false },
        { name: 'aaa', isDirectory: true },
      ];
      mockFs.listDirectory = vi.fn().mockReturnValue(entries);

      await lsCommand.execute([], mockContext);

      // Directories first (sorted), then files (sorted)
      expect(outputLines).toEqual(['aaa/', 'zzz/', 'aaa.txt', 'bbb.txt']);
    });

    it('sorts entries alphabetically within their type', async () => {
      const entries: FileEntry[] = [
        { name: 'zebra.txt', isDirectory: false },
        { name: 'apple.txt', isDirectory: false },
      ];
      mockFs.listDirectory = vi.fn().mockReturnValue(entries);

      await lsCommand.execute([], mockContext);

      expect(outputLines).toEqual(['apple.txt', 'zebra.txt']);
    });
  });

  describe('execute with path argument', () => {
    it('lists specified directory', async () => {
      const entries: FileEntry[] = [{ name: 'doc.txt', isDirectory: false }];
      mockFs.listDirectory = vi.fn().mockReturnValue(entries);
      mockContext.cwd = '/home';

      const result = await lsCommand.execute(['documents'], mockContext);

      expect(mockFs.listDirectory).toHaveBeenCalledWith('/home/documents');
      expect(result.exitCode).toBe(0);
    });

    it('lists absolute path', async () => {
      const entries: FileEntry[] = [{ name: 'item', isDirectory: true }];
      mockFs.listDirectory = vi.fn().mockReturnValue(entries);

      const result = await lsCommand.execute(['/var/log'], mockContext);

      expect(mockFs.listDirectory).toHaveBeenCalledWith('/var/log');
      expect(result.exitCode).toBe(0);
    });
  });

  describe('error handling', () => {
    it('returns error for non-existent path', async () => {
      mockFs.exists = vi.fn().mockReturnValue(false);

      const result = await lsCommand.execute(['nonexistent'], mockContext);

      expect(result.exitCode).toBe(1);
      expect(result.error).toContain('nonexistent');
    });

    it('returns error when path is not a directory', async () => {
      mockFs.exists = vi.fn().mockReturnValue(true);
      mockFs.isDirectory = vi.fn().mockReturnValue(false);

      const result = await lsCommand.execute(['file.txt'], mockContext);

      expect(result.exitCode).toBe(1);
      expect(result.error).toContain('not a directory');
    });

    it('outputs error message to terminal', async () => {
      mockFs.exists = vi.fn().mockReturnValue(false);

      await lsCommand.execute(['nonexistent'], mockContext);

      expect(mockContext.writeln).toHaveBeenCalled();
    });
  });
});
