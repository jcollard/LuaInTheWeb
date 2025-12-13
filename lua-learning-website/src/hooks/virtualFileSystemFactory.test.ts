import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createVirtualFileSystem } from './virtualFileSystemFactory'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('createVirtualFileSystem', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('creates a filesystem with root directory', () => {
      const fs = createVirtualFileSystem('test-workspace')

      expect(fs.exists('/')).toBe(true)
      expect(fs.isDirectory('/')).toBe(true)
    })

    it('starts with current directory as root', () => {
      const fs = createVirtualFileSystem('test-workspace')

      expect(fs.getCurrentDirectory()).toBe('/')
    })

    it('creates isolated filesystems per workspace ID', () => {
      const fs1 = createVirtualFileSystem('workspace-1')
      const fs2 = createVirtualFileSystem('workspace-2')

      fs1.writeFile('/file1.txt', 'content1')
      fs2.writeFile('/file2.txt', 'content2')

      expect(fs1.exists('/file1.txt')).toBe(true)
      expect(fs1.exists('/file2.txt')).toBe(false)
      expect(fs2.exists('/file1.txt')).toBe(false)
      expect(fs2.exists('/file2.txt')).toBe(true)
    })
  })

  describe('directory operations', () => {
    it('can create directories', () => {
      const fs = createVirtualFileSystem('test')

      fs.createDirectory('/projects')

      expect(fs.exists('/projects')).toBe(true)
      expect(fs.isDirectory('/projects')).toBe(true)
    })

    it('can create nested directories', () => {
      const fs = createVirtualFileSystem('test')

      fs.createDirectory('/projects')
      fs.createDirectory('/projects/app')

      expect(fs.exists('/projects/app')).toBe(true)
      expect(fs.isDirectory('/projects/app')).toBe(true)
    })

    it('throws when creating directory without parent', () => {
      const fs = createVirtualFileSystem('test')

      expect(() => fs.createDirectory('/a/b/c')).toThrow('Parent directory not found')
    })

    it('throws when creating directory that already exists', () => {
      const fs = createVirtualFileSystem('test')

      fs.createDirectory('/test')

      expect(() => fs.createDirectory('/test')).toThrow('Path already exists')
    })

    it('can set and get current directory', () => {
      const fs = createVirtualFileSystem('test')

      fs.createDirectory('/src')
      fs.setCurrentDirectory('/src')

      expect(fs.getCurrentDirectory()).toBe('/src')
    })

    it('throws when setting current directory to non-existent path', () => {
      const fs = createVirtualFileSystem('test')

      expect(() => fs.setCurrentDirectory('/nonexistent')).toThrow('Directory not found')
    })

    it('can list directory contents', () => {
      const fs = createVirtualFileSystem('test')

      fs.createDirectory('/src')
      fs.createDirectory('/docs')
      fs.writeFile('/README.md', '# Project')

      const entries = fs.listDirectory('/')

      expect(entries).toHaveLength(3)
      expect(entries.map((e) => e.name).sort()).toEqual(['README.md', 'docs', 'src'])
    })

    it('throws when listing non-existent directory', () => {
      const fs = createVirtualFileSystem('test')

      expect(() => fs.listDirectory('/nonexistent')).toThrow('Directory not found')
    })

    it('can delete empty directories', () => {
      const fs = createVirtualFileSystem('test')

      fs.createDirectory('/empty')
      fs.delete('/empty')

      expect(fs.exists('/empty')).toBe(false)
    })

    it('throws when deleting non-empty directory', () => {
      const fs = createVirtualFileSystem('test')

      fs.createDirectory('/notempty')
      fs.writeFile('/notempty/file.txt', 'content')

      expect(() => fs.delete('/notempty')).toThrow('Directory not empty')
    })
  })

  describe('file operations', () => {
    it('can write and read files', () => {
      const fs = createVirtualFileSystem('test')

      fs.writeFile('/hello.txt', 'Hello, World!')

      expect(fs.exists('/hello.txt')).toBe(true)
      expect(fs.isFile('/hello.txt')).toBe(true)
      expect(fs.readFile('/hello.txt')).toBe('Hello, World!')
    })

    it('can overwrite existing files', () => {
      const fs = createVirtualFileSystem('test')

      fs.writeFile('/file.txt', 'original')
      fs.writeFile('/file.txt', 'updated')

      expect(fs.readFile('/file.txt')).toBe('updated')
    })

    it('throws when writing to non-existent parent directory', () => {
      const fs = createVirtualFileSystem('test')

      expect(() => fs.writeFile('/noparent/file.txt', 'content')).toThrow(
        'Parent directory not found'
      )
    })

    it('throws when writing to a directory path', () => {
      const fs = createVirtualFileSystem('test')

      fs.createDirectory('/dir')

      expect(() => fs.writeFile('/dir', 'content')).toThrow('Cannot write to directory')
    })

    it('throws when reading non-existent file', () => {
      const fs = createVirtualFileSystem('test')

      expect(() => fs.readFile('/nonexistent.txt')).toThrow('File not found')
    })

    it('can delete files', () => {
      const fs = createVirtualFileSystem('test')

      fs.writeFile('/deleteme.txt', 'content')
      fs.delete('/deleteme.txt')

      expect(fs.exists('/deleteme.txt')).toBe(false)
    })

    it('throws when deleting non-existent path', () => {
      const fs = createVirtualFileSystem('test')

      expect(() => fs.delete('/nonexistent')).toThrow('Path not found')
    })
  })

  describe('relative path resolution', () => {
    it('resolves relative paths from current directory', () => {
      const fs = createVirtualFileSystem('test')

      fs.createDirectory('/src')
      fs.setCurrentDirectory('/src')
      fs.writeFile('file.txt', 'content')

      expect(fs.exists('/src/file.txt')).toBe(true)
      expect(fs.readFile('file.txt')).toBe('content')
    })

    it('handles parent directory references', () => {
      const fs = createVirtualFileSystem('test')

      fs.createDirectory('/src')
      fs.writeFile('/root.txt', 'root content')
      fs.setCurrentDirectory('/src')

      expect(fs.readFile('../root.txt')).toBe('root content')
    })
  })

  describe('persistence', () => {
    it('persists files to localStorage', () => {
      const fs = createVirtualFileSystem('persist-test')

      fs.writeFile('/data.txt', 'persisted data')

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'workspace:persist-test:fs',
        expect.any(String)
      )
    })

    it('restores files from localStorage', () => {
      const savedState = JSON.stringify({
        version: 1,
        files: {
          '/restored.txt': {
            name: 'restored.txt',
            content: 'restored content',
            createdAt: 12345,
            updatedAt: 12345,
          },
        },
        folders: ['/'],
      })
      localStorageMock.getItem.mockReturnValue(savedState)

      const fs = createVirtualFileSystem('restore-test')

      expect(fs.exists('/restored.txt')).toBe(true)
      expect(fs.readFile('/restored.txt')).toBe('restored content')
    })

    it('persists directories to localStorage', () => {
      const fs = createVirtualFileSystem('dir-test')

      fs.createDirectory('/mydir')

      const setItemCalls = localStorageMock.setItem.mock.calls
      const lastCall = setItemCalls[setItemCalls.length - 1]
      const savedData = JSON.parse(lastCall[1])

      expect(savedData.folders).toContain('/mydir')
    })

    it('handles corrupted localStorage gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json{{{')

      const fs = createVirtualFileSystem('corrupt-test')

      // Should initialize with empty state
      expect(fs.exists('/')).toBe(true)
      expect(fs.listDirectory('/')).toEqual([])
    })
  })

  describe('edge cases', () => {
    it('isFile returns false for directories', () => {
      const fs = createVirtualFileSystem('test')

      fs.createDirectory('/dir')

      expect(fs.isFile('/dir')).toBe(false)
    })

    it('isDirectory returns false for files', () => {
      const fs = createVirtualFileSystem('test')

      fs.writeFile('/file.txt', 'content')

      expect(fs.isDirectory('/file.txt')).toBe(false)
    })

    it('exists returns false for non-existent paths', () => {
      const fs = createVirtualFileSystem('test')

      expect(fs.exists('/nonexistent')).toBe(false)
    })

    it('listDirectory returns sorted entries', () => {
      const fs = createVirtualFileSystem('test')

      fs.writeFile('/zebra.txt', 'z')
      fs.writeFile('/apple.txt', 'a')
      fs.createDirectory('/banana')

      const entries = fs.listDirectory('/')
      const names = entries.map((e) => e.name)

      expect(names).toEqual(['apple.txt', 'banana', 'zebra.txt'])
    })

    it('listDirectory includes correct types', () => {
      const fs = createVirtualFileSystem('test')

      fs.writeFile('/file.txt', 'content')
      fs.createDirectory('/dir')

      const entries = fs.listDirectory('/')
      const fileEntry = entries.find((e) => e.name === 'file.txt')
      const dirEntry = entries.find((e) => e.name === 'dir')

      expect(fileEntry?.type).toBe('file')
      expect(dirEntry?.type).toBe('directory')
    })
  })
})
