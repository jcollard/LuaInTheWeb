/**
 * Tests for FileSystemAccessAPIFileSystem
 *
 * These tests use mocked FileSystemDirectoryHandle and FileSystemFileHandle
 * to test the IFileSystem implementation without requiring actual browser APIs.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FileSystemAccessAPIFileSystem } from '../src/FileSystemAccessAPIFileSystem'
import type { IFileSystem } from '../src/types'

// Mock types for File System Access API
interface MockFileSystemHandle {
  kind: 'file' | 'directory'
  name: string
}

interface MockFileSystemFileHandle extends MockFileSystemHandle {
  kind: 'file'
  getFile: () => Promise<File>
  createWritable: () => Promise<MockFileSystemWritableFileStream>
}

interface MockFileSystemDirectoryHandle extends MockFileSystemHandle {
  kind: 'directory'
  getFileHandle: (
    name: string,
    options?: { create?: boolean }
  ) => Promise<MockFileSystemFileHandle>
  getDirectoryHandle: (
    name: string,
    options?: { create?: boolean }
  ) => Promise<MockFileSystemDirectoryHandle>
  removeEntry: (name: string, options?: { recursive?: boolean }) => Promise<void>
  entries: () => AsyncIterableIterator<[string, MockFileSystemHandle]>
  values: () => AsyncIterableIterator<MockFileSystemHandle>
}

interface MockFileSystemWritableFileStream {
  write: (data: string) => Promise<void>
  close: () => Promise<void>
}

// Helper to create mock directory handle
function createMockDirectoryHandle(
  name: string,
  contents: Map<string, MockFileSystemHandle> = new Map()
): MockFileSystemDirectoryHandle {
  return {
    kind: 'directory',
    name,
    getFileHandle: vi.fn(async (fileName: string, options?: { create?: boolean }) => {
      const existing = contents.get(fileName)
      if (existing && existing.kind === 'file') {
        return existing as MockFileSystemFileHandle
      }
      if (options?.create) {
        const newFile = createMockFileHandle(fileName, '')
        contents.set(fileName, newFile)
        return newFile
      }
      throw new DOMException('File not found', 'NotFoundError')
    }),
    getDirectoryHandle: vi.fn(
      async (dirName: string, options?: { create?: boolean }) => {
        const existing = contents.get(dirName)
        if (existing && existing.kind === 'directory') {
          return existing as MockFileSystemDirectoryHandle
        }
        if (options?.create) {
          const newDir = createMockDirectoryHandle(dirName)
          contents.set(dirName, newDir)
          return newDir
        }
        throw new DOMException('Directory not found', 'NotFoundError')
      }
    ),
    removeEntry: vi.fn(async (entryName: string) => {
      if (!contents.has(entryName)) {
        throw new DOMException('Entry not found', 'NotFoundError')
      }
      contents.delete(entryName)
    }),
    entries: vi.fn(async function* () {
      for (const [key, value] of contents) {
        yield [key, value] as [string, MockFileSystemHandle]
      }
    }),
    values: vi.fn(async function* () {
      for (const value of contents.values()) {
        yield value
      }
    }),
  }
}

// Helper to create mock file handle
function createMockFileHandle(
  name: string,
  content: string
): MockFileSystemFileHandle {
  let fileContent = content
  return {
    kind: 'file',
    name,
    getFile: vi.fn(async () => new File([fileContent], name)),
    createWritable: vi.fn(async () => ({
      write: vi.fn(async (data: string) => {
        fileContent = data
      }),
      close: vi.fn(async () => {}),
    })),
  }
}

describe('FileSystemAccessAPIFileSystem', () => {
  describe('constructor and initialization', () => {
    it('should create an instance with a directory handle', () => {
      const mockHandle = createMockDirectoryHandle('root')
      const fs = new FileSystemAccessAPIFileSystem(
        mockHandle as unknown as FileSystemDirectoryHandle
      )
      expect(fs).toBeInstanceOf(FileSystemAccessAPIFileSystem)
    })

    it('should implement IFileSystem interface', () => {
      const mockHandle = createMockDirectoryHandle('root')
      const fs: IFileSystem = new FileSystemAccessAPIFileSystem(
        mockHandle as unknown as FileSystemDirectoryHandle
      )
      expect(fs.getCurrentDirectory).toBeDefined()
      expect(fs.setCurrentDirectory).toBeDefined()
      expect(fs.exists).toBeDefined()
      expect(fs.isDirectory).toBeDefined()
      expect(fs.isFile).toBeDefined()
      expect(fs.listDirectory).toBeDefined()
      expect(fs.readFile).toBeDefined()
      expect(fs.writeFile).toBeDefined()
      expect(fs.createDirectory).toBeDefined()
      expect(fs.delete).toBeDefined()
    })

    it('should start with root as current directory', () => {
      const mockHandle = createMockDirectoryHandle('root')
      const fs = new FileSystemAccessAPIFileSystem(
        mockHandle as unknown as FileSystemDirectoryHandle
      )
      expect(fs.getCurrentDirectory()).toBe('/')
    })
  })

  describe('initialize()', () => {
    it('should load directory structure into cache', async () => {
      const contents = new Map<string, MockFileSystemHandle>()
      contents.set('file1.txt', createMockFileHandle('file1.txt', 'content1'))
      contents.set('subdir', createMockDirectoryHandle('subdir'))

      const mockHandle = createMockDirectoryHandle('root', contents)
      const fs = new FileSystemAccessAPIFileSystem(
        mockHandle as unknown as FileSystemDirectoryHandle
      )

      await fs.initialize()

      expect(fs.exists('/file1.txt')).toBe(true)
      expect(fs.exists('/subdir')).toBe(true)
      expect(fs.isFile('/file1.txt')).toBe(true)
      expect(fs.isDirectory('/subdir')).toBe(true)
    })

    it('should recursively load nested directories', async () => {
      const nestedContents = new Map<string, MockFileSystemHandle>()
      nestedContents.set(
        'nested.txt',
        createMockFileHandle('nested.txt', 'nested content')
      )

      const subdirContents = new Map<string, MockFileSystemHandle>()
      subdirContents.set(
        'subdir2',
        createMockDirectoryHandle('subdir2', nestedContents)
      )

      const rootContents = new Map<string, MockFileSystemHandle>()
      rootContents.set(
        'subdir',
        createMockDirectoryHandle('subdir', subdirContents)
      )

      const mockHandle = createMockDirectoryHandle('root', rootContents)
      const fs = new FileSystemAccessAPIFileSystem(
        mockHandle as unknown as FileSystemDirectoryHandle
      )

      await fs.initialize()

      expect(fs.exists('/subdir/subdir2/nested.txt')).toBe(true)
      expect(fs.isFile('/subdir/subdir2/nested.txt')).toBe(true)
    })
  })

  describe('getCurrentDirectory() and setCurrentDirectory()', () => {
    it('should return root directory initially', () => {
      const mockHandle = createMockDirectoryHandle('root')
      const fs = new FileSystemAccessAPIFileSystem(
        mockHandle as unknown as FileSystemDirectoryHandle
      )
      expect(fs.getCurrentDirectory()).toBe('/')
    })

    it('should change current directory to valid path', async () => {
      const contents = new Map<string, MockFileSystemHandle>()
      contents.set('subdir', createMockDirectoryHandle('subdir'))

      const mockHandle = createMockDirectoryHandle('root', contents)
      const fs = new FileSystemAccessAPIFileSystem(
        mockHandle as unknown as FileSystemDirectoryHandle
      )
      await fs.initialize()

      fs.setCurrentDirectory('/subdir')
      expect(fs.getCurrentDirectory()).toBe('/subdir')
    })

    it('should throw error for non-existent directory', async () => {
      const mockHandle = createMockDirectoryHandle('root')
      const fs = new FileSystemAccessAPIFileSystem(
        mockHandle as unknown as FileSystemDirectoryHandle
      )
      await fs.initialize()

      expect(() => fs.setCurrentDirectory('/nonexistent')).toThrow()
    })

    it('should throw error when setting cwd to a file', async () => {
      const contents = new Map<string, MockFileSystemHandle>()
      contents.set('file.txt', createMockFileHandle('file.txt', 'content'))

      const mockHandle = createMockDirectoryHandle('root', contents)
      const fs = new FileSystemAccessAPIFileSystem(
        mockHandle as unknown as FileSystemDirectoryHandle
      )
      await fs.initialize()

      expect(() => fs.setCurrentDirectory('/file.txt')).toThrow()
    })
  })

  describe('exists()', () => {
    let fs: FileSystemAccessAPIFileSystem

    beforeEach(async () => {
      const contents = new Map<string, MockFileSystemHandle>()
      contents.set('file.txt', createMockFileHandle('file.txt', 'content'))
      contents.set('subdir', createMockDirectoryHandle('subdir'))

      const mockHandle = createMockDirectoryHandle('root', contents)
      fs = new FileSystemAccessAPIFileSystem(
        mockHandle as unknown as FileSystemDirectoryHandle
      )
      await fs.initialize()
    })

    it('should return true for existing file', () => {
      expect(fs.exists('/file.txt')).toBe(true)
    })

    it('should return true for existing directory', () => {
      expect(fs.exists('/subdir')).toBe(true)
    })

    it('should return false for non-existent path', () => {
      expect(fs.exists('/nonexistent')).toBe(false)
    })

    it('should return true for root directory', () => {
      expect(fs.exists('/')).toBe(true)
    })
  })

  describe('isDirectory() and isFile()', () => {
    let fs: FileSystemAccessAPIFileSystem

    beforeEach(async () => {
      const contents = new Map<string, MockFileSystemHandle>()
      contents.set('file.txt', createMockFileHandle('file.txt', 'content'))
      contents.set('subdir', createMockDirectoryHandle('subdir'))

      const mockHandle = createMockDirectoryHandle('root', contents)
      fs = new FileSystemAccessAPIFileSystem(
        mockHandle as unknown as FileSystemDirectoryHandle
      )
      await fs.initialize()
    })

    it('should return true for isDirectory on directory', () => {
      expect(fs.isDirectory('/subdir')).toBe(true)
    })

    it('should return false for isDirectory on file', () => {
      expect(fs.isDirectory('/file.txt')).toBe(false)
    })

    it('should return true for isFile on file', () => {
      expect(fs.isFile('/file.txt')).toBe(true)
    })

    it('should return false for isFile on directory', () => {
      expect(fs.isFile('/subdir')).toBe(false)
    })

    it('should return true for isDirectory on root', () => {
      expect(fs.isDirectory('/')).toBe(true)
    })

    it('should return false for non-existent paths', () => {
      expect(fs.isDirectory('/nonexistent')).toBe(false)
      expect(fs.isFile('/nonexistent')).toBe(false)
    })
  })

  describe('listDirectory()', () => {
    let fs: FileSystemAccessAPIFileSystem

    beforeEach(async () => {
      const subdirContents = new Map<string, MockFileSystemHandle>()
      subdirContents.set(
        'nested.txt',
        createMockFileHandle('nested.txt', 'nested')
      )

      const contents = new Map<string, MockFileSystemHandle>()
      contents.set('file1.txt', createMockFileHandle('file1.txt', 'content1'))
      contents.set('file2.txt', createMockFileHandle('file2.txt', 'content2'))
      contents.set(
        'subdir',
        createMockDirectoryHandle('subdir', subdirContents)
      )

      const mockHandle = createMockDirectoryHandle('root', contents)
      fs = new FileSystemAccessAPIFileSystem(
        mockHandle as unknown as FileSystemDirectoryHandle
      )
      await fs.initialize()
    })

    it('should list files and directories in root', () => {
      const entries = fs.listDirectory('/')
      expect(entries).toHaveLength(3)

      const names = entries.map((e) => e.name)
      expect(names).toContain('file1.txt')
      expect(names).toContain('file2.txt')
      expect(names).toContain('subdir')
    })

    it('should include correct types in entries', () => {
      const entries = fs.listDirectory('/')

      const file1 = entries.find((e) => e.name === 'file1.txt')
      const subdir = entries.find((e) => e.name === 'subdir')

      expect(file1?.type).toBe('file')
      expect(subdir?.type).toBe('directory')
    })

    it('should include correct paths in entries', () => {
      const entries = fs.listDirectory('/')

      const file1 = entries.find((e) => e.name === 'file1.txt')
      expect(file1?.path).toBe('/file1.txt')
    })

    it('should list contents of subdirectory', () => {
      const entries = fs.listDirectory('/subdir')
      expect(entries).toHaveLength(1)
      expect(entries[0].name).toBe('nested.txt')
      expect(entries[0].path).toBe('/subdir/nested.txt')
    })

    it('should throw for non-existent directory', () => {
      expect(() => fs.listDirectory('/nonexistent')).toThrow()
    })

    it('should throw when listing a file', () => {
      expect(() => fs.listDirectory('/file1.txt')).toThrow()
    })
  })

  describe('readFile()', () => {
    let fs: FileSystemAccessAPIFileSystem
    let mockHandle: MockFileSystemDirectoryHandle

    beforeEach(async () => {
      const contents = new Map<string, MockFileSystemHandle>()
      contents.set(
        'file.txt',
        createMockFileHandle('file.txt', 'Hello, World!')
      )
      contents.set('empty.txt', createMockFileHandle('empty.txt', ''))

      mockHandle = createMockDirectoryHandle('root', contents)
      fs = new FileSystemAccessAPIFileSystem(
        mockHandle as unknown as FileSystemDirectoryHandle
      )
      await fs.initialize()
    })

    it('should read file content', () => {
      const content = fs.readFile('/file.txt')
      expect(content).toBe('Hello, World!')
    })

    it('should read empty file', () => {
      const content = fs.readFile('/empty.txt')
      expect(content).toBe('')
    })

    it('should throw for non-existent file', () => {
      expect(() => fs.readFile('/nonexistent.txt')).toThrow()
    })

    it('should throw when reading a directory', () => {
      expect(() => fs.readFile('/')).toThrow()
    })
  })

  describe('writeFile()', () => {
    let fs: FileSystemAccessAPIFileSystem
    let mockHandle: MockFileSystemDirectoryHandle

    beforeEach(async () => {
      const contents = new Map<string, MockFileSystemHandle>()
      contents.set(
        'existing.txt',
        createMockFileHandle('existing.txt', 'old content')
      )

      mockHandle = createMockDirectoryHandle('root', contents)
      fs = new FileSystemAccessAPIFileSystem(
        mockHandle as unknown as FileSystemDirectoryHandle
      )
      await fs.initialize()
    })

    it('should overwrite existing file', () => {
      fs.writeFile('/existing.txt', 'new content')
      expect(fs.readFile('/existing.txt')).toBe('new content')
    })

    it('should create new file', () => {
      fs.writeFile('/new.txt', 'new file content')
      expect(fs.exists('/new.txt')).toBe(true)
      expect(fs.readFile('/new.txt')).toBe('new file content')
    })

    it('should throw when writing to a directory path', () => {
      expect(() => fs.writeFile('/', 'content')).toThrow()
    })

    it('should throw when parent directory does not exist', () => {
      expect(() => fs.writeFile('/nonexistent/file.txt', 'content')).toThrow()
    })
  })

  describe('createDirectory()', () => {
    let fs: FileSystemAccessAPIFileSystem

    beforeEach(async () => {
      const contents = new Map<string, MockFileSystemHandle>()
      contents.set('subdir', createMockDirectoryHandle('subdir'))

      const mockHandle = createMockDirectoryHandle('root', contents)
      fs = new FileSystemAccessAPIFileSystem(
        mockHandle as unknown as FileSystemDirectoryHandle
      )
      await fs.initialize()
    })

    it('should create new directory', () => {
      fs.createDirectory('/newdir')
      expect(fs.exists('/newdir')).toBe(true)
      expect(fs.isDirectory('/newdir')).toBe(true)
    })

    it('should throw when directory already exists', () => {
      expect(() => fs.createDirectory('/subdir')).toThrow()
    })

    it('should throw when parent does not exist', () => {
      expect(() => fs.createDirectory('/nonexistent/newdir')).toThrow()
    })
  })

  describe('delete()', () => {
    let fs: FileSystemAccessAPIFileSystem

    beforeEach(async () => {
      const subdirContents = new Map<string, MockFileSystemHandle>()
      subdirContents.set(
        'nested.txt',
        createMockFileHandle('nested.txt', 'nested')
      )

      const contents = new Map<string, MockFileSystemHandle>()
      contents.set('file.txt', createMockFileHandle('file.txt', 'content'))
      contents.set('empty-dir', createMockDirectoryHandle('empty-dir'))
      contents.set(
        'non-empty-dir',
        createMockDirectoryHandle('non-empty-dir', subdirContents)
      )

      const mockHandle = createMockDirectoryHandle('root', contents)
      fs = new FileSystemAccessAPIFileSystem(
        mockHandle as unknown as FileSystemDirectoryHandle
      )
      await fs.initialize()
    })

    it('should delete file', () => {
      fs.delete('/file.txt')
      expect(fs.exists('/file.txt')).toBe(false)
    })

    it('should delete empty directory', () => {
      fs.delete('/empty-dir')
      expect(fs.exists('/empty-dir')).toBe(false)
    })

    it('should throw when deleting non-empty directory', () => {
      expect(() => fs.delete('/non-empty-dir')).toThrow()
    })

    it('should throw for non-existent path', () => {
      expect(() => fs.delete('/nonexistent')).toThrow()
    })

    it('should throw when deleting root', () => {
      expect(() => fs.delete('/')).toThrow()
    })
  })

  describe('async write queue', () => {
    it('should queue async operations and flush them', async () => {
      const contents = new Map<string, MockFileSystemHandle>()
      const mockHandle = createMockDirectoryHandle('root', contents)
      const fs = new FileSystemAccessAPIFileSystem(
        mockHandle as unknown as FileSystemDirectoryHandle
      )
      await fs.initialize()

      // Write file (queued async operation)
      fs.writeFile('/test.txt', 'content')

      // Flush to ensure async operations complete
      await fs.flush()

      // Verify the async write was called
      expect(mockHandle.getFileHandle).toHaveBeenCalledWith('test.txt', {
        create: true,
      })
    })
  })

  describe('loadFileContent()', () => {
    it('should reload file content from handle into cache', async () => {
      const contents = new Map<string, MockFileSystemHandle>()
      const fileHandle = createMockFileHandle('file.txt', 'initial content')
      contents.set('file.txt', fileHandle)

      const mockHandle = createMockDirectoryHandle('root', contents)
      const fs = new FileSystemAccessAPIFileSystem(
        mockHandle as unknown as FileSystemDirectoryHandle
      )
      await fs.initialize()

      // Verify initial content
      expect(fs.readFile('/file.txt')).toBe('initial content')

      // loadFileContent should call getFile() on the handle
      await fs.loadFileContent('/file.txt')

      // Verify getFile was called (content reloaded from handle)
      expect(fileHandle.getFile).toHaveBeenCalled()
    })

    it('should throw for non-existent file', async () => {
      const mockHandle = createMockDirectoryHandle('root')
      const fs = new FileSystemAccessAPIFileSystem(
        mockHandle as unknown as FileSystemDirectoryHandle
      )
      await fs.initialize()

      await expect(fs.loadFileContent('/nonexistent.txt')).rejects.toThrow(
        /File not found/
      )
    })

    it('should throw for directory path', async () => {
      const contents = new Map<string, MockFileSystemHandle>()
      contents.set('subdir', createMockDirectoryHandle('subdir'))

      const mockHandle = createMockDirectoryHandle('root', contents)
      const fs = new FileSystemAccessAPIFileSystem(
        mockHandle as unknown as FileSystemDirectoryHandle
      )
      await fs.initialize()

      await expect(fs.loadFileContent('/subdir')).rejects.toThrow(
        /File not found/
      )
    })
  })

  describe('browser detection utility', () => {
    it('should export isFileSystemAccessSupported function', async () => {
      const { isFileSystemAccessSupported } = await import(
        '../src/FileSystemAccessAPIFileSystem'
      )
      expect(typeof isFileSystemAccessSupported).toBe('function')
    })

    it('should return false in Node.js environment (no window)', async () => {
      const { isFileSystemAccessSupported } = await import(
        '../src/FileSystemAccessAPIFileSystem'
      )
      // In Node.js/Vitest environment, window is undefined
      expect(isFileSystemAccessSupported()).toBe(false)
    })
  })

  describe('isInitialized property', () => {
    it('should return false before initialize() is called', () => {
      const mockHandle = createMockDirectoryHandle('root')
      const fs = new FileSystemAccessAPIFileSystem(
        mockHandle as unknown as FileSystemDirectoryHandle
      )
      expect(fs.isInitialized).toBe(false)
    })

    it('should return true after initialize() is called', async () => {
      const mockHandle = createMockDirectoryHandle('root')
      const fs = new FileSystemAccessAPIFileSystem(
        mockHandle as unknown as FileSystemDirectoryHandle
      )
      await fs.initialize()
      expect(fs.isInitialized).toBe(true)
    })
  })

  describe('error messages', () => {
    let fs: FileSystemAccessAPIFileSystem

    beforeEach(async () => {
      const contents = new Map<string, MockFileSystemHandle>()
      contents.set('file.txt', createMockFileHandle('file.txt', 'content'))
      contents.set('subdir', createMockDirectoryHandle('subdir'))

      const mockHandle = createMockDirectoryHandle('root', contents)
      fs = new FileSystemAccessAPIFileSystem(
        mockHandle as unknown as FileSystemDirectoryHandle
      )
      await fs.initialize()
    })

    it('should throw error with path for setCurrentDirectory on non-existent path', () => {
      expect(() => fs.setCurrentDirectory('/nonexistent')).toThrow(
        /Directory not found.*nonexistent/
      )
    })

    it('should throw error with path for setCurrentDirectory on file', () => {
      expect(() => fs.setCurrentDirectory('/file.txt')).toThrow(
        /Not a directory.*file\.txt/
      )
    })

    it('should throw error with path for listDirectory on non-existent path', () => {
      expect(() => fs.listDirectory('/nonexistent')).toThrow(
        /Directory not found.*nonexistent/
      )
    })

    it('should throw error with path for listDirectory on file', () => {
      expect(() => fs.listDirectory('/file.txt')).toThrow(
        /Not a directory.*file\.txt/
      )
    })

    it('should throw error with path for readFile on non-existent path', () => {
      expect(() => fs.readFile('/nonexistent.txt')).toThrow(
        /File not found.*nonexistent\.txt/
      )
    })

    it('should throw error with path for readFile on directory', () => {
      expect(() => fs.readFile('/subdir')).toThrow(/Not a file.*subdir/)
    })

    it('should throw error with path for writeFile when parent not found', () => {
      expect(() => fs.writeFile('/nonexistent/file.txt', 'content')).toThrow(
        /Parent directory not found.*nonexistent/
      )
    })

    it('should throw error with path for writeFile to directory', () => {
      expect(() => fs.writeFile('/subdir', 'content')).toThrow(
        /Cannot write to directory.*subdir/
      )
    })

    it('should throw error with path for createDirectory when already exists', () => {
      expect(() => fs.createDirectory('/subdir')).toThrow(
        /Path already exists.*subdir/
      )
    })

    it('should throw error with path for createDirectory when parent not found', () => {
      expect(() => fs.createDirectory('/nonexistent/newdir')).toThrow(
        /Parent directory not found.*nonexistent/
      )
    })

    it('should throw error with path for delete on non-existent path', () => {
      expect(() => fs.delete('/nonexistent')).toThrow(
        /Path not found.*nonexistent/
      )
    })

    it('should throw error message for delete on root', () => {
      expect(() => fs.delete('/')).toThrow(/Cannot delete root directory/)
    })

    it('should throw error with path for delete on non-empty directory', async () => {
      const subdirContents = new Map<string, MockFileSystemHandle>()
      subdirContents.set(
        'nested.txt',
        createMockFileHandle('nested.txt', 'nested')
      )

      const contents = new Map<string, MockFileSystemHandle>()
      contents.set(
        'non-empty-dir',
        createMockDirectoryHandle('non-empty-dir', subdirContents)
      )

      const mockHandle = createMockDirectoryHandle('root', contents)
      const fsWithNonEmpty = new FileSystemAccessAPIFileSystem(
        mockHandle as unknown as FileSystemDirectoryHandle
      )
      await fsWithNonEmpty.initialize()

      expect(() => fsWithNonEmpty.delete('/non-empty-dir')).toThrow(
        /Directory not empty.*non-empty-dir/
      )
    })
  })

  describe('edge cases', () => {
    it('should handle file deletion correctly (not confused with directory deletion)', async () => {
      const contents = new Map<string, MockFileSystemHandle>()
      contents.set('file.txt', createMockFileHandle('file.txt', 'content'))

      const mockHandle = createMockDirectoryHandle('root', contents)
      const fs = new FileSystemAccessAPIFileSystem(
        mockHandle as unknown as FileSystemDirectoryHandle
      )
      await fs.initialize()

      // Delete a file - should not be affected by directory non-empty check
      fs.delete('/file.txt')
      expect(fs.exists('/file.txt')).toBe(false)
    })

    it('should throw when writeFile parent is a file not directory', async () => {
      const contents = new Map<string, MockFileSystemHandle>()
      contents.set('file.txt', createMockFileHandle('file.txt', 'content'))

      const mockHandle = createMockDirectoryHandle('root', contents)
      const fs = new FileSystemAccessAPIFileSystem(
        mockHandle as unknown as FileSystemDirectoryHandle
      )
      await fs.initialize()

      // Try to write to /file.txt/child.txt - parent is a file
      expect(() => fs.writeFile('/file.txt/child.txt', 'content')).toThrow(
        /Parent is not a directory/
      )
    })

    it('should throw when createDirectory parent is a file not directory', async () => {
      const contents = new Map<string, MockFileSystemHandle>()
      contents.set('file.txt', createMockFileHandle('file.txt', 'content'))

      const mockHandle = createMockDirectoryHandle('root', contents)
      const fs = new FileSystemAccessAPIFileSystem(
        mockHandle as unknown as FileSystemDirectoryHandle
      )
      await fs.initialize()

      // Try to create directory under a file
      expect(() => fs.createDirectory('/file.txt/newdir')).toThrow(
        /Parent is not a directory/
      )
    })

    it('should correctly identify empty directory with no children vs file', async () => {
      const contents = new Map<string, MockFileSystemHandle>()
      contents.set('file.txt', createMockFileHandle('file.txt', 'content'))
      contents.set('empty-dir', createMockDirectoryHandle('empty-dir'))

      const mockHandle = createMockDirectoryHandle('root', contents)
      const fs = new FileSystemAccessAPIFileSystem(
        mockHandle as unknown as FileSystemDirectoryHandle
      )
      await fs.initialize()

      // File should be deletable (type !== 'directory' so no children check)
      fs.delete('/file.txt')
      expect(fs.exists('/file.txt')).toBe(false)

      // Empty directory should be deletable
      fs.delete('/empty-dir')
      expect(fs.exists('/empty-dir')).toBe(false)
    })

    it('should correctly check children size for non-empty directory', async () => {
      const subdirContents = new Map<string, MockFileSystemHandle>()
      subdirContents.set(
        'child.txt',
        createMockFileHandle('child.txt', 'content')
      )

      const contents = new Map<string, MockFileSystemHandle>()
      contents.set(
        'has-child',
        createMockDirectoryHandle('has-child', subdirContents)
      )

      const mockHandle = createMockDirectoryHandle('root', contents)
      const fs = new FileSystemAccessAPIFileSystem(
        mockHandle as unknown as FileSystemDirectoryHandle
      )
      await fs.initialize()

      // Directory with children should throw
      expect(() => fs.delete('/has-child')).toThrow(/Directory not empty/)
    })

    it('should allow creating directory when parent is directory (not file)', async () => {
      const contents = new Map<string, MockFileSystemHandle>()
      contents.set('subdir', createMockDirectoryHandle('subdir'))

      const mockHandle = createMockDirectoryHandle('root', contents)
      const fs = new FileSystemAccessAPIFileSystem(
        mockHandle as unknown as FileSystemDirectoryHandle
      )
      await fs.initialize()

      // Create directory under existing directory
      fs.createDirectory('/subdir/nested')
      expect(fs.exists('/subdir/nested')).toBe(true)
      expect(fs.isDirectory('/subdir/nested')).toBe(true)
    })

    it('should handle writeFile to new file in existing directory', async () => {
      const contents = new Map<string, MockFileSystemHandle>()
      contents.set('subdir', createMockDirectoryHandle('subdir'))

      const mockHandle = createMockDirectoryHandle('root', contents)
      const fs = new FileSystemAccessAPIFileSystem(
        mockHandle as unknown as FileSystemDirectoryHandle
      )
      await fs.initialize()

      // Write to new file in subdir
      fs.writeFile('/subdir/new.txt', 'new content')
      expect(fs.exists('/subdir/new.txt')).toBe(true)
      expect(fs.readFile('/subdir/new.txt')).toBe('new content')
    })

    it('should flush createDirectory operations', async () => {
      const contents = new Map<string, MockFileSystemHandle>()
      const mockHandle = createMockDirectoryHandle('root', contents)
      const fs = new FileSystemAccessAPIFileSystem(
        mockHandle as unknown as FileSystemDirectoryHandle
      )
      await fs.initialize()

      fs.createDirectory('/newdir')
      await fs.flush()

      expect(mockHandle.getDirectoryHandle).toHaveBeenCalledWith('newdir', {
        create: true,
      })
    })

    it('should flush delete operations', async () => {
      const contents = new Map<string, MockFileSystemHandle>()
      contents.set('file.txt', createMockFileHandle('file.txt', 'content'))

      const mockHandle = createMockDirectoryHandle('root', contents)
      const fs = new FileSystemAccessAPIFileSystem(
        mockHandle as unknown as FileSystemDirectoryHandle
      )
      await fs.initialize()

      fs.delete('/file.txt')
      await fs.flush()

      expect(mockHandle.removeEntry).toHaveBeenCalledWith('file.txt', {
        recursive: true,
      })
    })
  })

  describe('null handle scenarios (write-behind pattern)', () => {
    it('should create nested directories when parent has null handle', async () => {
      const contents = new Map<string, MockFileSystemHandle>()
      const mockHandle = createMockDirectoryHandle('root', contents)
      const fs = new FileSystemAccessAPIFileSystem(
        mockHandle as unknown as FileSystemDirectoryHandle
      )
      await fs.initialize()

      // Create nested directories before flush (parent has null handle)
      fs.createDirectory('/level1')
      fs.createDirectory('/level1/level2')
      fs.createDirectory('/level1/level2/level3')

      // Verify cache state
      expect(fs.exists('/level1')).toBe(true)
      expect(fs.exists('/level1/level2')).toBe(true)
      expect(fs.exists('/level1/level2/level3')).toBe(true)

      // Flush should create all directories
      await fs.flush()

      // Verify getDirectoryHandle was called for each level
      expect(mockHandle.getDirectoryHandle).toHaveBeenCalledWith('level1', { create: true })
    })

    it('should write file when parent directory has null handle', async () => {
      const contents = new Map<string, MockFileSystemHandle>()
      const mockHandle = createMockDirectoryHandle('root', contents)
      const fs = new FileSystemAccessAPIFileSystem(
        mockHandle as unknown as FileSystemDirectoryHandle
      )
      await fs.initialize()

      // Create directory then write file before flush
      fs.createDirectory('/newdir')
      fs.writeFile('/newdir/file.txt', 'content')

      // Verify cache state
      expect(fs.exists('/newdir')).toBe(true)
      expect(fs.exists('/newdir/file.txt')).toBe(true)
      expect(fs.readFile('/newdir/file.txt')).toBe('content')

      // Flush should work without errors
      await fs.flush()
    })

    it('should skip delete when parent was never persisted', async () => {
      const contents = new Map<string, MockFileSystemHandle>()
      const mockHandle = createMockDirectoryHandle('root', contents)
      const fs = new FileSystemAccessAPIFileSystem(
        mockHandle as unknown as FileSystemDirectoryHandle
      )
      await fs.initialize()

      // Create and then delete before flush (parent never persisted)
      fs.createDirectory('/tempdir')
      fs.writeFile('/tempdir/temp.txt', 'temp content')
      fs.delete('/tempdir/temp.txt')
      fs.delete('/tempdir')

      // Verify cache state
      expect(fs.exists('/tempdir')).toBe(false)
      expect(fs.exists('/tempdir/temp.txt')).toBe(false)

      // Flush should complete without errors
      await fs.flush()
    })

    it('should handle recursive folder copy with nested structure', async () => {
      const contents = new Map<string, MockFileSystemHandle>()
      const mockHandle = createMockDirectoryHandle('root', contents)
      const fs = new FileSystemAccessAPIFileSystem(
        mockHandle as unknown as FileSystemDirectoryHandle
      )
      await fs.initialize()

      // Create a directory structure
      fs.createDirectory('/source')
      fs.createDirectory('/source/sub1')
      fs.createDirectory('/source/sub1/sub2')
      fs.writeFile('/source/file1.txt', 'content1')
      fs.writeFile('/source/sub1/file2.txt', 'content2')
      fs.writeFile('/source/sub1/sub2/file3.txt', 'content3')

      // Verify the structure exists
      expect(fs.exists('/source/sub1/sub2/file3.txt')).toBe(true)
      expect(fs.readFile('/source/sub1/sub2/file3.txt')).toBe('content3')

      // Flush should persist all
      await fs.flush()
    })

    it('should use recursive: true when deleting directory with contents', async () => {
      const nestedContents = new Map<string, MockFileSystemHandle>()
      nestedContents.set('nested.txt', createMockFileHandle('nested.txt', 'nested'))

      const subdirContents = new Map<string, MockFileSystemHandle>()
      subdirContents.set('subfile.txt', createMockFileHandle('subfile.txt', 'sub content'))
      subdirContents.set('nested', createMockDirectoryHandle('nested', nestedContents))

      const contents = new Map<string, MockFileSystemHandle>()
      contents.set('mydir', createMockDirectoryHandle('mydir', subdirContents))

      const mockHandle = createMockDirectoryHandle('root', contents)
      const fs = new FileSystemAccessAPIFileSystem(
        mockHandle as unknown as FileSystemDirectoryHandle
      )
      await fs.initialize()

      // Delete nested contents first (required by sync API), then directory
      fs.delete('/mydir/nested/nested.txt')
      fs.delete('/mydir/nested')
      fs.delete('/mydir/subfile.txt')
      fs.delete('/mydir')

      await fs.flush()

      // All removeEntry calls should use recursive: true
      expect(mockHandle.removeEntry).toHaveBeenCalledWith('mydir', { recursive: true })
    })
  })
})
