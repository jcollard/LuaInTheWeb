import { describe, it, expect, vi } from 'vitest';
import { createFileSystemAdapter } from './createFileSystemAdapter';
import type { UseFileSystemReturn } from '../hooks/useFileSystem';

describe('createFileSystemAdapter', () => {
  const createMockFS = (): UseFileSystemReturn => ({
    createFile: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    deleteFile: vi.fn(),
    renameFile: vi.fn(),
    moveFile: vi.fn(),
    createFolder: vi.fn(),
    deleteFolder: vi.fn(),
    renameFolder: vi.fn(),
    exists: vi.fn(),
    listDirectory: vi.fn(),
    getTree: vi.fn(),
  });

  describe('exists', () => {
    it('delegates to underlying filesystem', () => {
      const mockFs = createMockFS();
      (mockFs.exists as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const adapter = createFileSystemAdapter(mockFs);

      expect(adapter.exists('/test')).toBe(true);
      expect(mockFs.exists).toHaveBeenCalledWith('/test');
    });
  });

  describe('isDirectory', () => {
    it('returns true for root', () => {
      const mockFs = createMockFS();
      const adapter = createFileSystemAdapter(mockFs);

      expect(adapter.isDirectory('/')).toBe(true);
    });

    it('returns false for non-existent path', () => {
      const mockFs = createMockFS();
      (mockFs.exists as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const adapter = createFileSystemAdapter(mockFs);

      expect(adapter.isDirectory('/nonexistent')).toBe(false);
    });

    it('returns true for folder (readFile returns null)', () => {
      const mockFs = createMockFS();
      (mockFs.exists as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (mockFs.readFile as ReturnType<typeof vi.fn>).mockReturnValue(null);

      const adapter = createFileSystemAdapter(mockFs);

      expect(adapter.isDirectory('/folder')).toBe(true);
    });

    it('returns false for file (readFile returns content)', () => {
      const mockFs = createMockFS();
      (mockFs.exists as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (mockFs.readFile as ReturnType<typeof vi.fn>).mockReturnValue('content');

      const adapter = createFileSystemAdapter(mockFs);

      expect(adapter.isDirectory('/file.txt')).toBe(false);
    });

    it('returns false for empty file (readFile returns empty string)', () => {
      const mockFs = createMockFS();
      (mockFs.exists as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (mockFs.readFile as ReturnType<typeof vi.fn>).mockReturnValue('');

      const adapter = createFileSystemAdapter(mockFs);

      expect(adapter.isDirectory('/empty.txt')).toBe(false);
    });
  });

  describe('listDirectory', () => {
    it('returns FileEntry array with isDirectory flag', () => {
      const mockFs = createMockFS();
      (mockFs.listDirectory as ReturnType<typeof vi.fn>).mockReturnValue([
        'file.txt',
        'folder',
      ]);
      (mockFs.exists as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (mockFs.readFile as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce('content') // file.txt
        .mockReturnValueOnce(null); // folder

      const adapter = createFileSystemAdapter(mockFs);
      const entries = adapter.listDirectory('/');

      expect(entries).toHaveLength(2);
      expect(entries[0]).toEqual({ name: 'file.txt', isDirectory: false });
      expect(entries[1]).toEqual({ name: 'folder', isDirectory: true });
    });

    it('handles nested paths correctly', () => {
      const mockFs = createMockFS();
      (mockFs.listDirectory as ReturnType<typeof vi.fn>).mockReturnValue([
        'doc.txt',
      ]);
      (mockFs.exists as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (mockFs.readFile as ReturnType<typeof vi.fn>).mockReturnValue('content');

      const adapter = createFileSystemAdapter(mockFs);
      adapter.listDirectory('/home/user');

      expect(mockFs.listDirectory).toHaveBeenCalledWith('/home/user');
    });
  });

  describe('readFile', () => {
    it('returns file content', () => {
      const mockFs = createMockFS();
      (mockFs.readFile as ReturnType<typeof vi.fn>).mockReturnValue(
        'file content'
      );

      const adapter = createFileSystemAdapter(mockFs);

      expect(adapter.readFile('/test.txt')).toBe('file content');
    });

    it('throws for non-existent file', () => {
      const mockFs = createMockFS();
      (mockFs.readFile as ReturnType<typeof vi.fn>).mockReturnValue(null);

      const adapter = createFileSystemAdapter(mockFs);

      expect(() => adapter.readFile('/nonexistent')).toThrow();
    });
  });
});
