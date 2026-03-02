import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createFileSystemAdapter } from '../src/createFileSystemAdapter'
import type { IFileSystem } from '../src/types'

/**
 * External filesystem interface that the adapter wraps.
 * This represents what the editor's useFileSystem hook provides.
 */
interface ExternalFileSystem {
  exists(path: string): boolean
  readFile(path: string): string | null
  writeFile(path: string, content: string): void
  createFolder(path: string): void
  deleteFile(path: string): void
  deleteFolder(path: string): void
  listDirectory(path: string): string[]
  createFile(path: string, content?: string): void
}

function createMockExternalFs(): ExternalFileSystem & { _isDirectory: Set<string> } {
  const _isDirectory = new Set<string>(['/'])

  return {
    _isDirectory,
    exists: vi.fn(() => false),
    readFile: vi.fn(() => null),
    writeFile: vi.fn(),
    createFile: vi.fn(),
    createFolder: vi.fn(),
    deleteFile: vi.fn(),
    deleteFolder: vi.fn(),
    listDirectory: vi.fn(() => []),
  }
}

describe('createFileSystemAdapter', () => {
  let externalFs: ReturnType<typeof createMockExternalFs>
  let adapter: IFileSystem

  beforeEach(() => {
    externalFs = createMockExternalFs()
    adapter = createFileSystemAdapter({
      exists: externalFs.exists,
      readFile: externalFs.readFile,
      writeFile: externalFs.writeFile,
      createFile: externalFs.createFile,
      createFolder: externalFs.createFolder,
      deleteFile: externalFs.deleteFile,
      deleteFolder: externalFs.deleteFolder,
      listDirectory: externalFs.listDirectory,
      isDirectory: (path: string) => externalFs._isDirectory.has(path),
    })
  })

  describe('getCurrentDirectory / setCurrentDirectory', () => {
    it('should default to root directory', () => {
      expect(adapter.getCurrentDirectory()).toBe('/')
    })

    it('should set and get current directory', () => {
      // Setup: pretend /home exists and is a directory
      externalFs._isDirectory.add('/home')
      vi.mocked(externalFs.exists).mockImplementation((p) => p === '/home' || p === '/')

      adapter.setCurrentDirectory('/home')
      expect(adapter.getCurrentDirectory()).toBe('/home')
    })

    it('should throw error when setting to non-existent path', () => {
      vi.mocked(externalFs.exists).mockReturnValue(false)

      expect(() => adapter.setCurrentDirectory('/nonexistent')).toThrow(
        "Directory not found: /nonexistent"
      )
    })

    it('should throw error when setting to a file path', () => {
      vi.mocked(externalFs.exists).mockReturnValue(true)
      // Not in isDirectory set means it's a file

      expect(() => adapter.setCurrentDirectory('/file.txt')).toThrow(
        "Not a directory: /file.txt"
      )
    })
  })

  describe('exists', () => {
    it('should delegate to external filesystem', () => {
      vi.mocked(externalFs.exists).mockReturnValue(true)
      expect(adapter.exists('/some/path')).toBe(true)
      expect(externalFs.exists).toHaveBeenCalledWith('/some/path')
    })

    it('should return false for non-existent paths', () => {
      vi.mocked(externalFs.exists).mockReturnValue(false)
      expect(adapter.exists('/missing')).toBe(false)
    })
  })

  describe('isDirectory', () => {
    it('should return true for directories', () => {
      externalFs._isDirectory.add('/mydir')
      vi.mocked(externalFs.exists).mockReturnValue(true)

      expect(adapter.isDirectory('/mydir')).toBe(true)
    })

    it('should return false for files', () => {
      vi.mocked(externalFs.exists).mockReturnValue(true)
      // Not in _isDirectory means it's a file

      expect(adapter.isDirectory('/file.txt')).toBe(false)
    })

    it('should return false for non-existent paths', () => {
      vi.mocked(externalFs.exists).mockReturnValue(false)
      expect(adapter.isDirectory('/nothing')).toBe(false)
    })
  })

  describe('isFile', () => {
    it('should return true for files', () => {
      vi.mocked(externalFs.exists).mockReturnValue(true)
      // Not in _isDirectory means it's a file

      expect(adapter.isFile('/file.txt')).toBe(true)
    })

    it('should return false for directories', () => {
      externalFs._isDirectory.add('/mydir')
      vi.mocked(externalFs.exists).mockReturnValue(true)

      expect(adapter.isFile('/mydir')).toBe(false)
    })

    it('should return false for non-existent paths', () => {
      vi.mocked(externalFs.exists).mockReturnValue(false)
      expect(adapter.isFile('/nothing')).toBe(false)
    })
  })

  describe('listDirectory', () => {
    it('should convert string array to FileEntry array', () => {
      vi.mocked(externalFs.exists).mockReturnValue(true)
      externalFs._isDirectory.add('/test')
      vi.mocked(externalFs.listDirectory).mockReturnValue(['file1.txt', 'folder1'])

      // Setup: folder1 is a directory, file1.txt is a file
      vi.mocked(externalFs.exists).mockImplementation((p) =>
        ['/test', '/test/file1.txt', '/test/folder1'].includes(p)
      )
      externalFs._isDirectory.add('/test/folder1')

      const entries = adapter.listDirectory('/test')

      expect(entries).toHaveLength(2)
      expect(entries).toContainEqual({
        name: 'file1.txt',
        type: 'file',
        path: '/test/file1.txt',
      })
      expect(entries).toContainEqual({
        name: 'folder1',
        type: 'directory',
        path: '/test/folder1',
      })
    })

    it('should throw error for non-existent directory', () => {
      vi.mocked(externalFs.exists).mockReturnValue(false)

      expect(() => adapter.listDirectory('/nonexistent')).toThrow(
        "Directory not found: /nonexistent"
      )
    })

    it('should throw error when path is a file', () => {
      vi.mocked(externalFs.exists).mockReturnValue(true)
      // Not in _isDirectory

      expect(() => adapter.listDirectory('/file.txt')).toThrow(
        "Not a directory: /file.txt"
      )
    })

    it('should return empty array for empty directory', () => {
      vi.mocked(externalFs.exists).mockReturnValue(true)
      externalFs._isDirectory.add('/empty')
      vi.mocked(externalFs.listDirectory).mockReturnValue([])

      const entries = adapter.listDirectory('/empty')
      expect(entries).toEqual([])
    })
  })

  describe('readFile', () => {
    it('should read file content', () => {
      vi.mocked(externalFs.exists).mockReturnValue(true)
      vi.mocked(externalFs.readFile).mockReturnValue('file content')

      const content = adapter.readFile('/test.txt')
      expect(content).toBe('file content')
      expect(externalFs.readFile).toHaveBeenCalledWith('/test.txt')
    })

    it('should throw error for non-existent file', () => {
      vi.mocked(externalFs.exists).mockReturnValue(false)

      expect(() => adapter.readFile('/missing.txt')).toThrow(
        "File not found: /missing.txt"
      )
    })

    it('should throw error when path is a directory', () => {
      vi.mocked(externalFs.exists).mockReturnValue(true)
      externalFs._isDirectory.add('/mydir')

      expect(() => adapter.readFile('/mydir')).toThrow(
        "Not a file: /mydir"
      )
    })

    it('should throw error when external readFile returns null', () => {
      vi.mocked(externalFs.exists).mockReturnValue(true)
      vi.mocked(externalFs.readFile).mockReturnValue(null)

      expect(() => adapter.readFile('/ghost.txt')).toThrow(
        "File not found: /ghost.txt"
      )
    })
  })

  describe('writeFile', () => {
    it('should write content to existing file', () => {
      vi.mocked(externalFs.exists).mockReturnValue(true)

      adapter.writeFile('/test.txt', 'new content')
      expect(externalFs.writeFile).toHaveBeenCalledWith('/test.txt', 'new content')
    })

    it('should create file if it does not exist', () => {
      vi.mocked(externalFs.exists).mockReturnValue(false)

      adapter.writeFile('/new.txt', 'content')
      expect(externalFs.createFile).toHaveBeenCalledWith('/new.txt', 'content')
    })

    it('should throw error when path is a directory', () => {
      vi.mocked(externalFs.exists).mockReturnValue(true)
      externalFs._isDirectory.add('/mydir')

      expect(() => adapter.writeFile('/mydir', 'content')).toThrow(
        "Cannot write to directory: /mydir"
      )
    })
  })

  describe('createDirectory', () => {
    it('should create a directory', () => {
      vi.mocked(externalFs.exists).mockImplementation((p) => p === '/')
      externalFs._isDirectory.add('/')

      adapter.createDirectory('/newdir')
      expect(externalFs.createFolder).toHaveBeenCalledWith('/newdir')
    })

    it('should throw error if path already exists', () => {
      vi.mocked(externalFs.exists).mockReturnValue(true)

      expect(() => adapter.createDirectory('/existing')).toThrow(
        "Path already exists: /existing"
      )
    })

    it('should throw error if parent does not exist', () => {
      vi.mocked(externalFs.exists).mockReturnValue(false)

      expect(() => adapter.createDirectory('/missing/child')).toThrow(
        "Parent directory not found: /missing"
      )
    })

    it('should track created directories for subsequent createDirectory calls', () => {
      // Simulate external filesystem where exists() has stale state
      // (doesn't immediately reflect directories we just created)
      vi.mocked(externalFs.exists).mockImplementation((path) => {
        // Only root exists according to external fs (stale state)
        return path === '/'
      })

      // First createDirectory should succeed (parent '/' exists)
      adapter.createDirectory('/foo')
      expect(externalFs.createFolder).toHaveBeenCalledWith('/foo')

      // Second createDirectory should also succeed because adapter
      // should track that we created '/foo'
      adapter.createDirectory('/foo/bar')
      expect(externalFs.createFolder).toHaveBeenCalledWith('/foo/bar')

      // Third level should also work
      adapter.createDirectory('/foo/bar/baz')
      expect(externalFs.createFolder).toHaveBeenCalledWith('/foo/bar/baz')
    })
  })

  describe('delete', () => {
    it('should delete a file', () => {
      vi.mocked(externalFs.exists).mockReturnValue(true)
      // Not in _isDirectory means file

      adapter.delete('/file.txt')
      expect(externalFs.deleteFile).toHaveBeenCalledWith('/file.txt')
    })

    it('should delete an empty directory', () => {
      vi.mocked(externalFs.exists).mockReturnValue(true)
      externalFs._isDirectory.add('/emptydir')
      vi.mocked(externalFs.listDirectory).mockReturnValue([])

      adapter.delete('/emptydir')
      expect(externalFs.deleteFolder).toHaveBeenCalledWith('/emptydir')
    })

    it('should throw error for non-existent path', () => {
      vi.mocked(externalFs.exists).mockReturnValue(false)

      expect(() => adapter.delete('/missing')).toThrow(
        "Path not found: /missing"
      )
    })

    it('should throw error for non-empty directory', () => {
      vi.mocked(externalFs.exists).mockReturnValue(true)
      externalFs._isDirectory.add('/nonempty')
      vi.mocked(externalFs.listDirectory).mockReturnValue(['file.txt'])

      expect(() => adapter.delete('/nonempty')).toThrow(
        "Directory not empty: /nonempty"
      )
    })
  })

  describe('path normalization', () => {
    it('should handle paths without leading slash', () => {
      vi.mocked(externalFs.exists).mockReturnValue(true)
      vi.mocked(externalFs.readFile).mockReturnValue('content')

      // When we call with a relative-looking path, it should normalize
      adapter.readFile('file.txt')

      // The adapter should normalize to absolute path
      expect(externalFs.readFile).toHaveBeenCalledWith('/file.txt')
    })

    it('should handle current directory in relative paths', () => {
      // Setup current directory to /home
      externalFs._isDirectory.add('/home')
      vi.mocked(externalFs.exists).mockReturnValue(true)
      adapter.setCurrentDirectory('/home')

      vi.mocked(externalFs.readFile).mockReturnValue('content')

      // Reading a relative path should resolve from current directory
      adapter.readFile('test.txt')
      expect(externalFs.readFile).toHaveBeenCalledWith('/home/test.txt')
    })
  })
})
